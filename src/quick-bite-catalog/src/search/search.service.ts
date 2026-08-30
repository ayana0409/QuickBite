import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FoodItem } from '@/food-item/entities/food-item.entity';
import { Restaurant } from '@/restaurant/entities/restaurant.entity';
import { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(FoodItem)
    private readonly foodItemRepo: Repository<FoodItem>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Advanced Full-Text Search with optional proximity scoring.
   *
   * Algorithm:
   *   1. PostgreSQL FTS: to_tsvector + to_tsquery + ts_rank for keyword scoring
   *   2. Filters: price range, restaurant rating (via JOIN), is_available
   *   3. Sorting:
   *      - With lat/lng: combined_score = (ts_rank * 0.6) - (ST_Distance / 10000 * 0.4)
   *      - Without lat/lng: ORDER BY ts_rank DESC, fi.rating DESC
   */
  async advancedSearch(dto: SearchQueryDto) {
    const {
      q,
      lat,
      lng,
      minPrice,
      maxPrice,
      minRating,
      page = 1,
      limit = 10,
    } = dto;

    const offset = (page - 1) * limit;
    const hasLocation = lat != null && lng != null;
    const hasQuery = q && q.trim().length > 0;

    // Build parameterized query parts
    const params: any[] = [];
    const addParam = (val: any): string => {
      params.push(val);
      return `$${params.length}`;
    };

    // Build FTS condition
    // unaccent() handles Vietnamese diacritics (e.g. "bun bo" matches "bún bò")
    let ftsCondition = '1=1';
    let rankExpr = '1.0';

    if (hasQuery) {
      // Sanitize query: replace special tsquery chars, add prefix search with :*
      const sanitized = q.trim().replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, ' ').trim();
      const tsQueryParam = addParam(sanitized);
      const rankParam = addParam(sanitized);

      ftsCondition = `to_tsvector('simple', unaccent(fi.name) || ' ' || unaccent(COALESCE(fi.description, '')))
          @@ websearch_to_tsquery('simple', unaccent(${tsQueryParam}))`;

      rankExpr = `ts_rank(
          to_tsvector('simple', unaccent(fi.name) || ' ' || unaccent(COALESCE(fi.description, ''))),
          websearch_to_tsquery('simple', unaccent(${rankParam}))
        )`;
    }

    // Build proximity score expression (PostGIS ST_Distance, degrees)
    let scoreExpr: string;
    let proximityJoin = '';
    if (hasLocation) {
      const latParam = addParam(lat);
      const lngParam = addParam(lng);

      scoreExpr = `(${rankExpr} * 0.6) - (
          COALESCE(ST_Distance(
            r.location,
            ST_SetSRID(ST_MakePoint(${lngParam}, ${latParam}), 4326)
          ), 99999) / 10000.0 * 0.4
        )`;

      // Join restaurant for location only when lat/lng is provided
      proximityJoin = 'LEFT JOIN restaurants r ON r.id = fi."restaurantId"';
    } else {
      scoreExpr = rankExpr;
      // Still need restaurant for rating filter
      if (minRating != null) {
        proximityJoin = 'LEFT JOIN restaurants r ON r.id = fi."restaurantId"';
      }
    }

    // Build filter conditions
    const conditions: string[] = ['fi."isAvailable" = true', ftsCondition];

    if (minPrice != null) {
      conditions.push(`fi.price >= ${addParam(minPrice)}`);
    }
    if (maxPrice != null) {
      conditions.push(`fi.price <= ${addParam(maxPrice)}`);
    }
    if (minRating != null) {
      conditions.push(`(r.rating->>'avg')::float >= ${addParam(minRating)}`);
    }

    const whereClause = conditions.join('\n      AND ');

    // Count query for pagination meta
    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM food_items fi
      ${proximityJoin}
      WHERE ${whereClause}
    `;

    // Main data query
    const dataSql = `
      SELECT
        fi.id,
        fi.name,
        fi.description,
        fi.price,
        fi.currency,
        fi.images,
        fi."isAvailable",
        fi."preparationTime",
        fi.tags,
        fi."totalSold",
        fi.rating,
        fi."reviewCount",
        fi."categoryId",
        fi."restaurantId",
        fi.variants,
        fi.toppings,
        (${scoreExpr}) AS score
      FROM food_items fi
      ${proximityJoin}
      WHERE ${whereClause}
      ORDER BY score DESC, fi.rating DESC
      LIMIT ${addParam(limit)} OFFSET ${addParam(offset)}
    `;

    try {
      const [countResult, data] = await Promise.all([
        this.dataSource.query(countSql, params.slice(0, params.length - 2)),
        this.dataSource.query(dataSql, params),
      ]);

      // Re-run count with proper params (count query uses same params except limit/offset)
      const countParams = params.slice(0, params.length - 2);
      const [countRes] = await this.dataSource.query(countSql, countParams);
      const total = parseInt(countRes?.total ?? '0', 10);

      return {
        data,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      this.logger.error(`[advancedSearch] Query failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Run the search and return paginated results properly.
   * Wrapper that correctly separates count params from data params.
   */
  async search(dto: SearchQueryDto) {
    const {
      q,
      lat,
      lng,
      minPrice,
      maxPrice,
      minRating,
      page = 1,
      limit = 10,
    } = dto;

    const offset = (page - 1) * limit;
    const hasLocation = lat != null && lng != null;
    const hasQuery = q && q.trim().length > 0;
    const needsRestaurantJoin = hasLocation || minRating != null;

    // Separate params for count vs data query
    const sharedParams: any[] = [];
    const addShared = (val: any): string => {
      sharedParams.push(val);
      return `$${sharedParams.length}`;
    };

    // FTS
    let ftsCondition = '1=1';
    let rankExpr = '1.0::float';

    if (hasQuery) {
      // Sanitize query: replace special chars, use websearch_to_tsquery for natural language
      const sanitized = q.trim().replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, ' ').trim();
      const p = addShared(sanitized);
      ftsCondition = `to_tsvector('simple', immutable_unaccent(fi.name) || ' ' || immutable_unaccent(COALESCE(fi.description, '')))
        @@ websearch_to_tsquery('simple', immutable_unaccent(${p}))`;
      rankExpr = `ts_rank(
        to_tsvector('simple', immutable_unaccent(fi.name) || ' ' || immutable_unaccent(COALESCE(fi.description, ''))),
        websearch_to_tsquery('simple', immutable_unaccent(${p}))
      )`;

    }

    // Score expression with proximity
    let scoreExpr: string;
    if (hasLocation) {
      const latP = addShared(lat);
      const lngP = addShared(lng);
      scoreExpr = `(${rankExpr} * 0.6) - (
        COALESCE(ST_Distance(
          r.location,
          ST_SetSRID(ST_MakePoint(${lngP}, ${latP}), 4326)
        ), 99999) / 10000.0 * 0.4
      )`;
    } else {
      scoreExpr = rankExpr;
    }

    // Filters
    const conditions: string[] = ['fi."isAvailable" = true', ftsCondition];
    if (minPrice != null) conditions.push(`fi.price >= ${addShared(minPrice)}`);
    if (maxPrice != null) conditions.push(`fi.price <= ${addShared(maxPrice)}`);
    if (minRating != null) conditions.push(`(r.rating->>'avg')::float >= ${addShared(minRating)}`);

    const joinClause = needsRestaurantJoin
      ? 'LEFT JOIN restaurants r ON r.id = fi."restaurantId"'
      : '';

    const whereClause = conditions.join('\n        AND ');

    // Clone params for data query (add limit + offset)
    const dataParams = [...sharedParams, limit, offset];
    const limitIdx = dataParams.length - 1;
    const offsetIdx = dataParams.length;

    const dataSql = `
      SELECT
        fi.id,
        fi.name,
        fi.description,
        fi.price,
        fi.currency,
        fi.images,
        fi."isAvailable",
        fi."preparationTime",
        fi.tags,
        fi."totalSold",
        fi.rating,
        fi."reviewCount",
        fi."categoryId",
        fi."restaurantId",
        fi.variants,
        fi.toppings,
        (${scoreExpr}) AS score
      FROM food_items fi
      ${joinClause}
      WHERE ${whereClause}
      ORDER BY score DESC, fi.rating DESC
      LIMIT $${sharedParams.length + 1} OFFSET $${sharedParams.length + 2}
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM food_items fi
      ${joinClause}
      WHERE ${whereClause}
    `;

    this.logger.debug(`[search] q="${q}" lat=${lat} lng=${lng} minPrice=${minPrice} maxPrice=${maxPrice} minRating=${minRating}`);

    try {
      const [rows, countRows] = await Promise.all([
        this.dataSource.query(dataSql, dataParams),
        this.dataSource.query(countSql, sharedParams),
      ]);

      const total = parseInt(countRows[0]?.total ?? '0', 10);

      return {
        data: rows,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      this.logger.error(`[search] Failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}

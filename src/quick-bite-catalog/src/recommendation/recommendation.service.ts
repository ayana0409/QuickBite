import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { FoodItem } from '@/food-item/entities/food-item.entity';
import { Restaurant } from '@/restaurant/entities/restaurant.entity';
import { Category } from '@/category/entities/category.entity';
import { NearbyQueryDto } from './dto/nearby.dto';
import { SimilarFoodsQueryDto } from './dto/similar-foods.dto';
import { TrendingQueryDto } from './dto/trending.dto';

const TRENDING_CACHE_KEY = 'recommendation:trending';
const TRENDING_TTL_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    @InjectRepository(FoodItem)
    private readonly foodItemRepo: Repository<FoodItem>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  // ──────────────────────────────────────────────────────────────────────
  // A. Nearby Restaurants
  // Uses PostGIS ST_DWithin for radius filter and ST_Distance for ordering.
  // ──────────────────────────────────────────────────────────────────────
  async getNearbyRestaurants(dto: NearbyQueryDto) {
    const { lat, lng, radius = 5000, limit = 10 } = dto;

    this.logger.log(`[getNearbyRestaurants] lat=${lat} lng=${lng} radius=${radius}m limit=${limit}`);

    // ST_DWithin uses degrees when geometry type is used; convert meters to degrees (~111320m/degree)
    // Using geography cast ensures proper meter-based distance calculation
    const sql = `
      SELECT
        r.id,
        r.name,
        r.slug,
        r.status,
        r.address,
        r.rating,
        r."ownerId",
        r."createdAt",
        ST_Distance(
          r.location::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        ) AS distance_meters,
        (
          SELECT json_agg(json_build_object('id', c.id, 'name', c.name))
          FROM categories c WHERE c."restaurantId" = r.id
        ) AS categories,
        (
          SELECT COUNT(*)::int
          FROM food_items fi
          WHERE fi."restaurantId" = r.id AND fi."isAvailable" = true
        ) AS available_food_count
      FROM restaurants r
      WHERE
        r.location IS NOT NULL
        AND r.status = 'open'
        AND ST_DWithin(
          r.location::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
          $3
        )
      ORDER BY distance_meters ASC
      LIMIT $4
    `;

    try {
      const rows = await this.dataSource.query(sql, [lat, lng, radius, limit]);
      return rows;
    } catch (error: any) {
      this.logger.error(`[getNearbyRestaurants] Failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // B. Similar Foods
  // Finds foods with same categoryId OR overlapping tags (PostgreSQL && array overlap).
  // Ranks by number of common tags (desc) then rating (desc).
  // ──────────────────────────────────────────────────────────────────────
  async getSimilarFoods(foodId: string, dto: SimilarFoodsQueryDto) {
    const { limit = 8 } = dto;

    // Fetch source food item to extract categoryId and tags
    const source = await this.foodItemRepo.findOne({ where: { id: foodId } });
    if (!source) {
      throw new NotFoundException(`Food item ${foodId} not found`);
    }

    const { categoryId, tags = [] } = source;

    this.logger.log(`[getSimilarFoods] foodId=${foodId} categoryId=${categoryId} tags=[${tags.join(',')}] limit=${limit}`);

    // Build query: find items with same category OR overlapping tags
    // Use PostgreSQL ARRAY overlap operator && for tags
    const sql = `
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
        -- Rank by: number of overlapping tags (tag affinity) + rating boost
        (
          COALESCE(array_length(
            ARRAY(
              SELECT unnest(fi.tags) INTERSECT SELECT unnest($3::text[])
            ),
            1
          ), 0) * 0.6 + fi.rating * 0.4
        ) AS similarity_score
      FROM food_items fi
      WHERE
        fi.id != $1
        AND fi."isAvailable" = true
        AND (
          fi."categoryId" = $2
          OR (array_length($3::text[], 1) > 0 AND fi.tags && $3::text[])
        )
      ORDER BY similarity_score DESC, fi."totalSold" DESC
      LIMIT $4
    `;

    try {
      const rows = await this.dataSource.query(sql, [
        foodId,
        categoryId,
        tags.length > 0 ? tags : '{}',
        limit,
      ]);
      return rows;
    } catch (error: any) {
      this.logger.error(`[getSimilarFoods] Failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // C. Trending Foods
  // Calculates trending_score = (total_sold * 0.7) + (rating * 30)
  // Result is cached in memory for 30 minutes to reduce DB load.
  // ──────────────────────────────────────────────────────────────────────
  async getTrendingFoods(dto: TrendingQueryDto) {
    const { limit = 10 } = dto;
    const cacheKey = `${TRENDING_CACHE_KEY}:${limit}`;

    // Try to serve from in-memory cache (TTL = 30 minutes)
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.log(`[getTrendingFoods] Cache HIT for key: ${cacheKey}`);
      return cached;
    }

    this.logger.log(`[getTrendingFoods] Cache MISS — querying DB for limit=${limit}`);

    const sql = `
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
        -- Trending score formula: weighted combination of sales volume and rating
        (fi."totalSold" * 0.7 + fi.rating * 30) AS trending_score
      FROM food_items fi
      WHERE fi."isAvailable" = true
      ORDER BY trending_score DESC
      LIMIT $1
    `;

    try {
      const rows = await this.dataSource.query(sql, [limit]);

      // Store in cache with TTL in seconds (cache-manager v5 uses seconds)
      await this.cacheManager.set(cacheKey, rows, TRENDING_TTL_MS / 1000);
      this.logger.log(`[getTrendingFoods] Cached ${rows.length} items for ${TRENDING_TTL_MS / 1000}s`);

      return rows;
    } catch (error: any) {
      this.logger.error(`[getTrendingFoods] Failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}

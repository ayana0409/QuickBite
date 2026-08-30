import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

// Controller exposes GET /search endpoint (proxied via API Gateway as GET /catalog/search)
@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Advanced Full-Text Search for food items.
   * Supports: keyword search, price filter, rating filter, proximity-based scoring.
   *
   * Example: GET /search?q=bún bò&lat=10.776&lng=106.700&minPrice=20000&maxPrice=80000&minRating=4
   */
  @Get()
  @ApiOperation({
    summary: 'Advanced Full-Text Search for food items',
    description: `
      Search food items using PostgreSQL Full-Text Search (FTS).
      - Keyword matching with Vietnamese diacritic support (unaccent).
      - Filter by price range and restaurant rating.
      - When lat/lng provided: results ranked by combined text relevance + proximity score.
      - When no lat/lng: results ranked by text relevance (ts_rank) then rating.
    `,
  })
  async search(@Query() dto: SearchQueryDto) {
    const result = await this.searchService.search(dto);
    return {
      success: true,
      statusCode: 200,
      message: 'Success.',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}

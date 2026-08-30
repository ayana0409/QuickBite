import { Controller, All, Req, Res, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { Request, Response } from 'express';
import { DynamicConfigService } from '../config/dynamic-config.service';
import { RedisCacheService, CachedResponse } from '../cache/redis-cache.service';
import { firstValueFrom } from 'rxjs';

@Controller()
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: DynamicConfigService,
    private readonly redisCacheService: RedisCacheService,
  ) {}

  @All('identity{*path}')
  async proxyIdentity(@Req() req: Request, @Res() res: Response) {
    await this.forwardRequest('IDENTITY_URL', req, res);
  }

  @All('order{*path}')
  async proxyOrder(@Req() req: Request, @Res() res: Response) {
    await this.forwardRequest('ORDER_URL', req, res);
  }

  @All('catalog{*path}')
  async proxyCatalog(@Req() req: Request, @Res() res: Response) {
    await this.forwardRequest('CATALOG_URL', req, res);
  }

  @All('restaurants{*path}')
  async proxyRestaurants(@Req() req: Request, @Res() res: Response) {
    await this.forwardRequest('CATALOG_URL', req, res);
  }

  @All('categories{*path}')
  async proxyCategories(@Req() req: Request, @Res() res: Response) {
    await this.forwardRequest('CATALOG_URL', req, res);
  }

  @All('food-items{*path}')
  async proxyFoodItems(@Req() req: Request, @Res() res: Response) {
    await this.forwardRequest('CATALOG_URL', req, res);
  }

  @All('reviews{*path}')
  async proxyReviews(@Req() req: Request, @Res() res: Response) {
    await this.forwardRequest('CATALOG_URL', req, res);
  }

  @All('requests{*path}')
  async proxyRequests(@Req() req: Request, @Res() res: Response) {
    await this.forwardRequest('CATALOG_URL', req, res);
  }

  @All('inventory{*path}')
  async proxyInventory(@Req() req: Request, @Res() res: Response) {
    await this.forwardRequest('INVENTORY_URL', req, res);
  }

  @All('api/v1/inventory{*path}')
  async proxyApiV1Inventory(@Req() req: Request, @Res() res: Response) {
    await this.forwardRequest('INVENTORY_URL', req, res);
  }

  @All('payments{*path}')
  async proxyPayment(@Req() req: Request, @Res() res: Response) {
    await this.forwardRequest('PAYMENT_URL', req, res);
  }

  private getCatalogCacheKeyAndTtl(req: Request): { key: string; ttl: number } | null {
    const cleanPath = req.originalUrl.replace(/^\/catalog/, '');
    const pathname = cleanPath.split('?')[0];

    // 1. Food Items endpoints
    const foodItemSubMatch = pathname.match(/^\/food-items\/([^\/]+)\/(images|variants|toppings)$/);
    if (foodItemSubMatch) {
      return null;
    }

    const foodItemRestaurantMatch = pathname.match(/^\/food-items\/restaurant\/([^\/]+)$/);
    if (foodItemRestaurantMatch) {
      return { key: `catalog:food-items:restaurant:${cleanPath}`, ttl: 120 };
    }

    const foodItemCategoryMatch = pathname.match(/^\/food-items\/category\/([^\/]+)$/);
    if (foodItemCategoryMatch) {
      return { key: `catalog:food-items:category:${cleanPath}`, ttl: 120 };
    }

    const foodItemSingleMatch = pathname.match(/^\/food-items\/([^\/]+)$/);
    if (foodItemSingleMatch) {
      return { key: `catalog:food-item:${foodItemSingleMatch[1]}`, ttl: 600 };
    }

    if (pathname === '/food-items' || pathname === '/food-items/') {
      return { key: `catalog:food-items:list:${cleanPath}`, ttl: 120 };
    }

    // 2. Categories endpoints
    const categorySingleMatch = pathname.match(/^\/categories\/([^\/]+)$/);
    if (categorySingleMatch) {
      return { key: `catalog:category:${categorySingleMatch[1]}`, ttl: 600 };
    }

    if (pathname === '/categories' || pathname === '/categories/') {
      return { key: `catalog:categories:list:${cleanPath}`, ttl: 300 };
    }

    // 3. Restaurants endpoints
    const restaurantOwnerMatch = pathname.match(/^\/restaurants\/owner\/([^\/]+)$/);
    if (restaurantOwnerMatch) {
      return { key: `catalog:restaurant:owner:${restaurantOwnerMatch[1]}`, ttl: 300 };
    }

    const restaurantSingleMatch = pathname.match(/^\/restaurants\/([^\/]+)$/);
    if (restaurantSingleMatch) {
      return { key: `catalog:restaurant:${restaurantSingleMatch[1]}`, ttl: 600 };
    }

    if (pathname === '/restaurants' || pathname === '/restaurants/') {
      return { key: `catalog:restaurants:list:${cleanPath}`, ttl: 300 };
    }

    // 4. Reviews endpoints
    const reviewsByRestaurantMatch = pathname.match(/^\/reviews\/restaurants\/([^\/]+)$/);
    if (reviewsByRestaurantMatch) {
      return { key: `catalog:reviews:restaurant:${cleanPath}`, ttl: 60 };
    }

    const reviewsByFoodItemMatch = pathname.match(/^\/reviews\/food-items\/([^\/]+)$/);
    if (reviewsByFoodItemMatch) {
      return { key: `catalog:reviews:food-item:${cleanPath}`, ttl: 60 };
    }

    // 5. Requests endpoints (Cache requests list query)
    if (pathname === '/requests' || pathname === '/requests/') {
      return { key: `catalog:requests:list:${cleanPath}`, ttl: 60 };
    }

    // 6. Search endpoint - short TTL because query params vary widely
    if (pathname === '/search' || pathname === '/search/') {
      return { key: `catalog:search:${cleanPath}`, ttl: 30 };
    }

    // 7. Recommendations endpoints
    // - trending: cached longer (result is stable, backed by in-memory cache in service)
    // - nearby: no cache (depends on user coordinates)
    // - similar-foods: cached per foodId
    if (pathname === '/recommendations/trending' || pathname === '/recommendations/trending/') {
      return { key: `catalog:recommendations:trending:${cleanPath}`, ttl: 1800 };
    }

    const similarFoodsMatch = pathname.match(/^\/recommendations\/similar-foods\/([^/]+)$/);
    if (similarFoodsMatch) {
      return { key: `catalog:recommendations:similar:${similarFoodsMatch[1]}`, ttl: 300 };
    }

    // nearby is NOT cached (user coordinates are unique per request)
    if (pathname === '/recommendations/nearby' || pathname === '/recommendations/nearby/') {
      return null;
    }

    return null;

  }

  private async invalidateCatalogCache(req: Request): Promise<void> {
    const cleanPath = req.originalUrl.replace(/^\/catalog/, '');
    const pathname = cleanPath.split('?')[0];
    const method = req.method.toUpperCase();

    // 1. Food Item sub-resource updates (POST, PUT, PATCH, DELETE /food-items/:id/images, variants, toppings)
    const foodItemSubMatch = pathname.match(/^\/food-items\/([^\/]+)\/(images|variants|toppings)/);
    if (foodItemSubMatch && (method === 'PATCH' || method === 'POST' || method === 'PUT' || method === 'DELETE')) {
      const foodId = foodItemSubMatch[1];
      this.logger.log(`⚡ [CACHE INVALIDATION] Food Item Sub-resource update for ID [${foodId}] (${method})`);
      await this.redisCacheService.del(`catalog:food-item:${foodId}`);
      await this.redisCacheService.delByPattern('catalog:food-items:*');
      return;
    }


    // 2. Food Item single update or delete (PATCH or DELETE /food-items/:id)
    const foodItemSingleMatch = pathname.match(/^\/food-items\/([^\/]+)$/);
    if (foodItemSingleMatch && (method === 'PATCH' || method === 'DELETE')) {
      const foodId = foodItemSingleMatch[1];
      this.logger.log(`⚡ [CACHE INVALIDATION] Food Item update/delete for ID [${foodId}]`);
      await this.redisCacheService.del(`catalog:food-item:${foodId}`);
      await this.redisCacheService.delByPattern('catalog:food-items:*');
      return;
    }

    // 3. Food Item creation (POST /food-items)
    if ((pathname === '/food-items' || pathname === '/food-items/') && method === 'POST') {
      this.logger.log(`⚡ [CACHE INVALIDATION] Food Item created`);
      await this.redisCacheService.delByPattern('catalog:food-items:*');
      return;
    }

    // 4. Category single update or delete (PATCH or DELETE /categories/:id)
    const categorySingleMatch = pathname.match(/^\/categories\/([^\/]+)$/);
    if (categorySingleMatch && (method === 'PATCH' || method === 'DELETE')) {
      const catId = categorySingleMatch[1];
      this.logger.log(`⚡ [CACHE INVALIDATION] Category update/delete for ID [${catId}]`);
      await this.redisCacheService.del(`catalog:category:${catId}`);
      await this.redisCacheService.delByPattern('catalog:categories:*');
      await this.redisCacheService.delByPattern('catalog:restaurant:*');
      return;
    }

    // 5. Category creation (POST /categories)
    if ((pathname === '/categories' || pathname === '/categories/') && method === 'POST') {
      this.logger.log(`⚡ [CACHE INVALIDATION] Category created`);
      await this.redisCacheService.delByPattern('catalog:categories:*');
      await this.redisCacheService.delByPattern('catalog:restaurant:*');
      return;
    }

    // 6. Restaurant single update or delete (PATCH, PUT or DELETE /restaurants/:id or /restaurants/me)
    const restaurantSingleMatch = pathname.match(/^\/restaurants\/([^\/]+)$/);
    if (restaurantSingleMatch && (method === 'PATCH' || method === 'PUT' || method === 'DELETE')) {
      const restId = restaurantSingleMatch[1];
      this.logger.log(`⚡ [CACHE INVALIDATION] Restaurant update/delete for Target [${restId}]`);
      await this.redisCacheService.del(`catalog:restaurant:${restId}`);
      await this.redisCacheService.delByPattern('catalog:restaurant:owner:*');
      await this.redisCacheService.delByPattern('catalog:restaurants:list:*');
      await this.redisCacheService.delByPattern('catalog:restaurant:*');
      if (method === 'DELETE') {
        await this.redisCacheService.delByPattern('catalog:categories:*');
        await this.redisCacheService.delByPattern('catalog:food-items:*');
      }
      return;
    }

    // 7. Restaurant creation (POST /restaurants)
    if ((pathname === '/restaurants' || pathname === '/restaurants/') && method === 'POST') {
      this.logger.log(`⚡ [CACHE INVALIDATION] Restaurant created`);
      await this.redisCacheService.delByPattern('catalog:restaurant:owner:*');
      await this.redisCacheService.delByPattern('catalog:restaurants:list:*');
      return;
    }

    // 8. Reviews: POST /reviews/batch (Invalidate reviews, food items and restaurants cache)
    if ((pathname === '/reviews/batch' || pathname === '/reviews/batch/') && method === 'POST') {
      this.logger.log(`⚡ [CACHE INVALIDATION] Reviews created in batch`);
      await this.redisCacheService.delByPattern('catalog:reviews:*');
      await this.redisCacheService.delByPattern('catalog:food-item:*');
      await this.redisCacheService.delByPattern('catalog:food-items:*');
      await this.redisCacheService.delByPattern('catalog:restaurant:*');
      return;
    }

    // 9. Requests: POST /requests or PATCH /requests/:id/process (Invalidate requests & restaurants cache)
    if (pathname.startsWith('/requests') && (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE')) {
      this.logger.log(`⚡ [CACHE INVALIDATION] Requests modified (${method} ${pathname}) -> Invalidating catalog:requests:*`);
      await this.redisCacheService.delByPattern('catalog:requests:*');
      if (method === 'PATCH') {
        this.logger.log(`⚡ [CACHE INVALIDATION] Request processed -> Invalidating catalog:restaurant:*`);
        await this.redisCacheService.delByPattern('catalog:restaurants:list:*');
        await this.redisCacheService.delByPattern('catalog:restaurant:*');
      }
      return;
    }
  }

  private async forwardRequest(targetConfigKey: string, req: Request, res: Response) {
    const startTime = Date.now();
    const targetBaseUrl = await this.configService.getAsync(targetConfigKey);

    if (!targetBaseUrl) {
      this.logger.warn(`⚠️ [PROXY WARN] Service URL for ${targetConfigKey} is not configured.`);
      res.status(503).json({
        statusCode: 503,
        message: `Service URL for ${targetConfigKey} is not configured in Gateway environment.`,
      });
      return;
    }

    // Compute relativePath based on service target
    let relativePath = req.originalUrl;
    if (targetConfigKey === 'INVENTORY_URL') {
      // Keep /inventory path so it appends cleanly to INVENTORY_URL (http://localhost:8083/api/v1)
      relativePath = req.originalUrl.replace(/^\/api\/v1/, '');
    } else {
      relativePath = req.originalUrl.replace(/^\/(catalog|identity|order|inventory|payments)/, '');
    }

    const cleanBaseUrl = targetBaseUrl.replace(/\/$/, '');
    const formattedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    const targetUrl = `${cleanBaseUrl}${formattedPath}`;

    // Cache lookup for GET requests to CATALOG_URL
    let cacheConfig: { key: string; ttl: number } | null = null;
    if (targetConfigKey === 'CATALOG_URL' && req.method === 'GET') {
      cacheConfig = this.getCatalogCacheKeyAndTtl(req);
      if (cacheConfig) {
        const cached = await this.redisCacheService.get<CachedResponse>(cacheConfig.key);
        if (cached) {
          this.logger.log(`⚡ [CACHE HIT] ${req.method} ${req.originalUrl} (Key: ${cacheConfig.key}) -> Serving directly from Redis cache`);
          res.status(cached.statusCode).send(cached.data);
          return;
        }
        this.logger.log(`🔍 [CACHE MISS] ${req.method} ${req.originalUrl} (Key: ${cacheConfig.key}) -> Fetching from upstream Catalog Service`);
      }
    }

    if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
      this.logger.log(`🔀 [PROXY FORWARD] ${req.method} ${req.originalUrl} -> ${targetUrl} | BODY: ${JSON.stringify(req.body)}`);
    } else {
      this.logger.log(`🔀 [PROXY FORWARD] ${req.method} ${req.originalUrl} -> ${targetUrl}`);
    }

    const isMultipart = (req.headers['content-type'] || '').toLowerCase().includes('multipart');
    const requestData = isMultipart ? req : req.body;

    const maxAttempts = isMultipart ? 1 : 3; // Do not retry streamed multipart requests as the stream is consumed
    let lastResponse: any = null;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.request({
            method: req.method,
            url: targetUrl,
            data: requestData,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            headers: {
              ...req.headers,
              host: undefined,
              ...(isMultipart ? {} : { 'content-length': undefined }),
            },
            validateStatus: () => true, // Accept all status codes to inspect Render 502/503 HTML
            timeout: isMultipart ? 60000 : 15000,
          }),
        );


        lastResponse = response;
        const isHtml502 =
          (response.status === 502 || response.status === 503) &&
          typeof response.data === 'string' &&
          response.data.includes('<!DOCTYPE html>');

        // If downstream returned Render 502/503 HTML (Cold Start in progress), retry to wait for container startup
        if (isHtml502) {
          this.logger.warn(
            `⏳ [RENDER COLD START] ${req.method} ${targetUrl} returned HTTP ${response.status} HTML. Waiting for service to boot... (${attempt}/${maxAttempts})`,
          );
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 4000)); // Wait 4s before retry
            continue;
          }
        }

        const duration = Date.now() - startTime;
        this.logger.log(
          `✅ [PROXY RESPONSE] ${req.method} ${req.originalUrl} -> ${targetUrl} [HTTP ${response.status}] (${duration}ms)`,
        );

        // Save cache for GET requests on success (HTTP 2xx)
        if (targetConfigKey === 'CATALOG_URL' && req.method === 'GET' && cacheConfig && response.status >= 200 && response.status < 300) {
          await this.redisCacheService.set(
            cacheConfig.key,
            { statusCode: response.status, data: response.data },
            cacheConfig.ttl,
          );
          this.logger.log(`💾 [CACHE STORED] Saved response for ${req.method} ${req.originalUrl} to Redis (Key: ${cacheConfig.key}, TTL: ${cacheConfig.ttl}s)`);
        }

        // Cache invalidation for catalog mutations on success (HTTP 2xx)
        if (targetConfigKey === 'CATALOG_URL' && req.method !== 'GET' && response.status >= 200 && response.status < 300) {
          await this.invalidateCatalogCache(req);
        }

        res.status(response.status).set(response.headers).send(response.data);
        return;
      } catch (error: any) {
        lastError = error;
        this.logger.warn(
          `⚠️ [PROXY ATTEMPT FAILED] ${req.method} ${targetUrl} (Attempt ${attempt}/${maxAttempts}) - ${error.message}`,
        );

        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    }

    const duration = Date.now() - startTime;
    this.logger.error(
      `❌ [PROXY ERROR] ${req.method} ${req.originalUrl} -> ${targetUrl} [${duration}ms] - Final Error: ${
        lastError?.message || (lastResponse ? `HTTP ${lastResponse.status}` : 'Downstream failure')
      }`,
    );

    if (lastResponse) {
      res.status(lastResponse.status).set(lastResponse.headers).send(lastResponse.data);
    } else {
      res.status(502).json({
        statusCode: 502,
        message: `Bad Gateway: Unable to connect to downstream service at ${targetUrl}`,
        error: lastError?.message,
      });
    }
  }
}

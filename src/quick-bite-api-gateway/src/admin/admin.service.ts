import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DynamicConfigService } from '../config/dynamic-config.service';
import { RedisCacheService } from '../cache/redis-cache.service';

export interface AdminOverviewStatsDto {
  totalActiveRestaurants: number;
  todayOrders: number;
  totalSystemRevenue: number;
  cachedAt?: string;
}

export interface AdminChartsDto {
  revenueChart: Array<{
    date: string;
    dayName: string;
    revenue: number;
    ordersCount: number;
  }>;
  orderStatusChart: Array<{
    status: string;
    name: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  cachedAt?: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  // Redis Cache Keys & Default Long TTL (24 hours - only refreshed when requested)
  private readonly CACHE_KEY_OVERVIEW = 'admin:stats:overview';
  private readonly CACHE_KEY_CHARTS = 'admin:stats:charts';
  private readonly CACHE_TTL_SECONDS = 86400; // 24 hours

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: DynamicConfigService,
    private readonly redisCacheService: RedisCacheService,
  ) {}

  /**
   * Validates if the authenticated user has the Admin/Administrator role or permissions
   */
  validateAdminRole(user: any): void {
    if (process.env.BYPASS_AUTH === 'true') {
      return;
    }

    if (!user) {
      throw new ForbiddenException('Access denied: Authentication payload is missing.');
    }

    const rawRoles =
      user.role ||
      user.roles ||
      user['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      user['role'] ||
      user.permissions ||
      user.permission ||
      [];

    let rolesList: string[] = [];
    if (Array.isArray(rawRoles)) {
      rolesList = rawRoles.map((r) => String(r).toLowerCase());
    } else if (typeof rawRoles === 'string') {
      try {
        const parsed = JSON.parse(rawRoles);
        rolesList = Array.isArray(parsed)
          ? parsed.map((r) => String(r).toLowerCase())
          : [rawRoles.toLowerCase()];
      } catch {
        rolesList = rawRoles.split(/[,\s]+/).map((r) => r.toLowerCase());
      }
    }

    const isAdmin = rolesList.some((r) =>
      ['admin', 'administrator', 'superadmin', 'system_admin', 'order.orders.adminview'].includes(r),
    );

    if (!isAdmin) {
      this.logger.warn(`⚠️ [ADMIN GUARD] Access denied for user: ${JSON.stringify(user?.sub || user?.id)}. Roles: ${rolesList.join(', ')}`);
      throw new ForbiddenException('Access denied: Administrator role is required.');
    }
  }

  /**
   * Aggregates overview statistics from Catalog Service & Order Service with Redis Cache.
   * Only calls downstream microservices if cache is empty or forceRefresh is true.
   */
  async getOverviewStats(authHeader?: string, forceRefresh = false): Promise<{
    success: boolean;
    data: AdminOverviewStatsDto;
    message: string;
    statusCode: number;
    cached: boolean;
  }> {
    // 1. Check Redis Cache
    if (!forceRefresh) {
      const cached = await this.redisCacheService.get<AdminOverviewStatsDto>(this.CACHE_KEY_OVERVIEW);
      if (cached) {
        this.logger.log('⚡ [CACHE HIT] Serving Admin Overview stats from Redis Cache');
        return {
          success: true,
          statusCode: 200,
          message: 'Admin overview statistics retrieved from cache',
          data: cached,
          cached: true,
        };
      }
    }

    this.logger.log('🔄 [CACHE MISS / REFRESH] Fetching fresh overview stats from Catalog and Order services...');

    const [catalogStats, orderStats] = await Promise.allSettled([
      this.fetchActiveRestaurantsCount(authHeader),
      this.fetchOrderStatistics(authHeader),
    ]);

    let totalActiveRestaurants = 0;
    if (catalogStats.status === 'fulfilled') {
      totalActiveRestaurants = catalogStats.value;
    }

    let todayOrders = 0;
    let totalSystemRevenue = 0;

    if (orderStats.status === 'fulfilled' && orderStats.value) {
      todayOrders = orderStats.value.todayOrders ?? orderStats.value.totalOrders ?? 0;
      totalSystemRevenue = orderStats.value.totalRevenue ?? orderStats.value.revenueToday ?? 0;
      if (totalActiveRestaurants === 0 && orderStats.value.activeRestaurantsCount > 0) {
        totalActiveRestaurants = orderStats.value.activeRestaurantsCount;
      }
    }

    const overviewData: AdminOverviewStatsDto = {
      totalActiveRestaurants,
      todayOrders,
      totalSystemRevenue,
      cachedAt: new Date().toISOString(),
    };

    // Store in Redis Cache
    await this.redisCacheService.set(
      this.CACHE_KEY_OVERVIEW,
      overviewData,
      this.CACHE_TTL_SECONDS,
    );
    this.logger.log(`💾 [CACHE STORED] Saved Admin Overview stats to Redis (TTL: ${this.CACHE_TTL_SECONDS}s)`);

    return {
      success: true,
      statusCode: 200,
      message: 'Admin overview statistics computed and cached successfully',
      data: overviewData,
      cached: false,
    };
  }

  /**
   * Aggregates 30-day revenue chart and order status breakdown with Redis Cache.
   * Only calls downstream microservices if cache is empty or forceRefresh is true.
   */
  async getChartsData(authHeader?: string, forceRefresh = false): Promise<{
    success: boolean;
    data: AdminChartsDto;
    message: string;
    statusCode: number;
    cached: boolean;
  }> {
    // 1. Check Redis Cache
    if (!forceRefresh) {
      const cached = await this.redisCacheService.get<AdminChartsDto>(this.CACHE_KEY_CHARTS);
      if (cached) {
        this.logger.log('⚡ [CACHE HIT] Serving Admin Charts data from Redis Cache');
        return {
          success: true,
          statusCode: 200,
          message: 'Admin charts statistics retrieved from cache',
          data: cached,
          cached: true,
        };
      }
    }

    this.logger.log('🔄 [CACHE MISS / REFRESH] Fetching fresh charts data from Order service...');

    let orderStats: any = null;
    try {
      orderStats = await this.fetchOrderStatistics(authHeader);
    } catch (error: any) {
      this.logger.error(`❌ [ADMIN CHARTS] Failed to fetch order statistics: ${error.message}`);
    }

    const revenueChart = orderStats?.revenue30Days?.length > 0
      ? orderStats.revenue30Days
      : [];

    const orderStatusChart = orderStats?.orderStatusBreakdown?.length > 0
      ? orderStats.orderStatusBreakdown
      : [];

    const chartsData: AdminChartsDto = {
      revenueChart,
      orderStatusChart,
      cachedAt: new Date().toISOString(),
    };

    // Store in Redis Cache
    await this.redisCacheService.set(
      this.CACHE_KEY_CHARTS,
      chartsData,
      this.CACHE_TTL_SECONDS,
    );
    this.logger.log(`💾 [CACHE STORED] Saved Admin Charts data to Redis (TTL: ${this.CACHE_TTL_SECONDS}s)`);

    return {
      success: true,
      statusCode: 200,
      message: 'Admin charts statistics computed and cached successfully',
      data: chartsData,
      cached: false,
    };
  }

  /**
   * Resets and immediately refreshes both Overview and Charts cache in Gateway Redis.
   */
  async resetAndRefreshStatsCache(authHeader?: string): Promise<{
    success: boolean;
    statusCode: number;
    message: string;
    data: {
      overview: AdminOverviewStatsDto;
      charts: AdminChartsDto;
    };
  }> {
    this.logger.log('🗑️ [CACHE RESET] Explicit reset requested for Admin Analytics cache');

    // Invalidate both cache keys in Redis
    await Promise.all([
      this.redisCacheService.del(this.CACHE_KEY_OVERVIEW),
      this.redisCacheService.del(this.CACHE_KEY_CHARTS),
    ]);

    // Force compute fresh data and re-populate cache
    const [overviewRes, chartsRes] = await Promise.all([
      this.getOverviewStats(authHeader, true),
      this.getChartsData(authHeader, true),
    ]);

    return {
      success: true,
      statusCode: 200,
      message: 'Admin analytics cache has been invalidated and refreshed with fresh data',
      data: {
        overview: overviewRes.data,
        charts: chartsRes.data,
      },
    };
  }

  /**
   * Helper to fetch active restaurant count from Catalog Service
   */
  private async fetchActiveRestaurantsCount(authHeader?: string): Promise<number> {
    try {
      const catalogBaseUrl = await this.configService.getAsync('CATALOG_URL', 'http://localhost:3000');
      const cleanUrl = catalogBaseUrl.replace(/\/$/, '');
      const endpoint = `${cleanUrl}/restaurants?limit=1`;

      const res = await firstValueFrom(
        this.httpService.get(endpoint, {
          headers: authHeader ? { Authorization: authHeader } : undefined,
          validateStatus: () => true,
          timeout: 8000,
        }),
      );

      if (res.status >= 200 && res.status < 300) {
        const body = res.data;
        const total = body?.data?.meta?.total ?? body?.meta?.total ?? body?.total ?? (Array.isArray(body?.data) ? body.data.length : 0);
        return typeof total === 'number' ? total : 0;
      }
    } catch (err: any) {
      this.logger.warn(`⚠️ [ADMIN STATS] Could not fetch catalog restaurant count: ${err.message}`);
    }
    return 0;
  }

  /**
   * Helper to fetch admin statistics from Order Service (.NET ABP)
   */
  private async fetchOrderStatistics(authHeader?: string): Promise<any> {
    const orderBaseUrl = await this.configService.getAsync('ORDER_URL', 'https://localhost:44386/api/app');
    const cleanOrderUrl = orderBaseUrl.replace(/\/$/, '');

    const endpointPath = cleanOrderUrl.endsWith('/order')
      ? '/admin-statistics'
      : '/order/admin-statistics';
    const orderTargetUrl = `${cleanOrderUrl}${endpointPath}`;

    this.logger.log(`🔀 [ADMIN STATS] Calling Order Service at ${orderTargetUrl}`);

    const res = await firstValueFrom(
      this.httpService.get(orderTargetUrl, {
        headers: authHeader ? { Authorization: authHeader } : undefined,
        validateStatus: () => true,
        timeout: 12000,
      }),
    );

    if (res.status >= 200 && res.status < 300) {
      const data = res.data?.data ?? res.data;
      return data;
    }

    // Fallback: If admin-statistics is not available, try standard statistics endpoint
    this.logger.warn(`⚠️ [ADMIN STATS] Order admin-statistics returned HTTP ${res.status}, attempting fallback...`);
    const fallbackPath = cleanOrderUrl.endsWith('/order') ? '/statistics' : '/order/statistics';
    const fallbackUrl = `${cleanOrderUrl}${fallbackPath}`;

    const fallbackRes = await firstValueFrom(
      this.httpService.get(fallbackUrl, {
        headers: authHeader ? { Authorization: authHeader } : undefined,
        validateStatus: () => true,
        timeout: 8000,
      }),
    );

    if (fallbackRes.status >= 200 && fallbackRes.status < 300) {
      const fbData = fallbackRes.data?.data ?? fallbackRes.data;
      return {
        totalOrders: fbData?.kpiSummary?.ordersToday ?? 0,
        todayOrders: fbData?.kpiSummary?.ordersToday ?? 0,
        totalRevenue: fbData?.kpiSummary?.revenueToday ?? 0,
        revenueToday: fbData?.kpiSummary?.revenueToday ?? 0,
        activeRestaurantsCount: 1,
        revenue30Days: fbData?.revenueData ?? [],
        orderStatusBreakdown: fbData?.cancelReasonData ?? [],
      };
    }

    return null;
  }
}

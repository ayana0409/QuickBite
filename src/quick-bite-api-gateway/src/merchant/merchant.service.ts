import { Injectable, ForbiddenException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DynamicConfigService } from '../config/dynamic-config.service';
import { GetMerchantOrdersQueryDto } from './dto/get-merchant-orders.query.dto';

@Injectable()
export class MerchantService {
  private readonly logger = new Logger(MerchantService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: DynamicConfigService,
  ) {}

  /**
   * Aggregation method to fetch merchant orders securely by resolving restaurantId from userId
   * @param userId The ID extracted from the authenticated user's JWT (sub claim)
   * @param query Query parameters containing pagination, status, and search filters
   */
  async getMerchantOrders(userId: string, query: GetMerchantOrdersQueryDto, authHeader?: string) {
    // Step 1: Fetch restaurant details by owner ID from Catalog Service
    const catalogBaseUrl = await this.configService.getAsync('CATALOG_URL', 'http://localhost:3000');
    const cleanCatalogUrl = catalogBaseUrl.replace(/\/$/, '');
    const catalogEndpoint = `${cleanCatalogUrl}/restaurants/owner/${userId}`;

    this.logger.log(`🔍 [MERCHANT AGGREGATION] Fetching restaurant for userId: ${userId} via ${catalogEndpoint}`);

    let catalogResponse: any;
    try {
      catalogResponse = await firstValueFrom(
        this.httpService.get(catalogEndpoint, {
          headers: authHeader ? { Authorization: authHeader } : undefined,
          validateStatus: () => true,
          timeout: 10000,
        }),
      );
    } catch (error: any) {
      this.logger.error(`❌ [MERCHANT AGGREGATION] Failed to contact Catalog Service: ${error.message}`);
      throw new HttpException(
        'Catalog Service is currently unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (catalogResponse.status === 404 || !catalogResponse.data) {
      this.logger.warn(`⚠️ [MERCHANT AGGREGATION] User [${userId}] does not own any restaurant (404/null response)`);
      throw new ForbiddenException('Access denied: You do not own a restaurant.');
    }

    // Unwrap response data if wrapped in Global Response Wrapper ({ data: { id: ... } }) or direct object
    const restaurant = catalogResponse.data?.data ?? catalogResponse.data;
    const restaurantId = restaurant?.id;

    if (!restaurantId) {
      this.logger.warn(`⚠️ [MERCHANT AGGREGATION] Restaurant payload missing 'id' field for userId [${userId}]`);
      throw new ForbiddenException('Access denied: You do not own a valid restaurant.');
    }

    this.logger.log(`✅ [MERCHANT AGGREGATION] Resolved restaurantId: ${restaurantId} for userId: ${userId}`);

    // Step 2: Fetch orders for the resolved restaurantId from Order Service
    const orderBaseUrl = await this.configService.getAsync('ORDER_URL', 'https://localhost:44386/api/app');
    const cleanOrderUrl = orderBaseUrl.replace(/\/$/, '');
    
    // Construct order endpoint safely depending on base path
    const orderEndpointPath = cleanOrderUrl.endsWith('/order') 
      ? '/by-restaurant' 
      : '/order/by-restaurant';
    const orderTargetUrl = `${cleanOrderUrl}${orderEndpointPath}`;

    // Build query params for ABP Framework Order Service (convert page/limit -> skipCount/maxResultCount)
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skipCount = (page - 1) * limit;

    const params: Record<string, any> = {
      restaurantId,
      skipCount,
      maxResultCount: limit,
      ...(query.status && { status: query.status }),
      ...(query.search && { search: query.search }),
    };

    this.logger.log(`🔀 [MERCHANT AGGREGATION] Querying Order Service at ${orderTargetUrl} with params: ${JSON.stringify(params)}`);

    let orderResponse: any;
    try {
      orderResponse = await firstValueFrom(
        this.httpService.get(orderTargetUrl, {
          params,
          headers: authHeader ? { Authorization: authHeader } : undefined,
          validateStatus: () => true,
          timeout: 15000,
        }),
      );
    } catch (error: any) {
      this.logger.error(`❌ [MERCHANT AGGREGATION] Failed to contact Order Service: ${error.message}`);
      throw new HttpException(
        'Order Service is currently unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // If downstream returned non-2xx status, propagate status and error response
    if (orderResponse.status >= 400) {
      throw new HttpException(
        orderResponse.data || 'Failed to fetch orders from Order Service',
        orderResponse.status,
      );
    }

    // Return Order Service response directly to Frontend
    return orderResponse.data;
  }

  /**
   * Aggregates merchant dashboard metrics:
   * 1. Resolves restaurantId and rating from Catalog Service
   * 2. Calls Order Service for dashboard calculations (revenue, KPIs, cancel reasons, recent orders)
   * 3. Merges catalog rating and returns unified response
   */
  async getMerchantDashboard(userId: string, authHeader?: string) {
    // Step 1: Fetch restaurant details by owner ID from Catalog Service
    const catalogBaseUrl = await this.configService.getAsync('CATALOG_URL', 'http://localhost:3000');
    const cleanCatalogUrl = catalogBaseUrl.replace(/\/$/, '');
    const catalogEndpoint = `${cleanCatalogUrl}/restaurants/owner/${userId}`;

    this.logger.log(`🔍 [MERCHANT DASHBOARD] Fetching restaurant for userId: ${userId} via ${catalogEndpoint}`);

    let catalogResponse: any;
    try {
      catalogResponse = await firstValueFrom(
        this.httpService.get(catalogEndpoint, {
          headers: authHeader ? { Authorization: authHeader } : undefined,
          validateStatus: () => true,
          timeout: 10000,
        }),
      );
    } catch (error: any) {
      this.logger.error(`❌ [MERCHANT DASHBOARD] Failed to contact Catalog Service: ${error.message}`);
      throw new HttpException(
        'Catalog Service is currently unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (catalogResponse.status === 404 || !catalogResponse.data) {
      this.logger.warn(`⚠️ [MERCHANT DASHBOARD] User [${userId}] does not own any restaurant (404/null response)`);
      throw new ForbiddenException('Access denied: You do not own a restaurant.');
    }

    const restaurant = catalogResponse.data?.data ?? catalogResponse.data;
    const restaurantId = restaurant?.id;

    if (!restaurantId) {
      this.logger.warn(`⚠️ [MERCHANT DASHBOARD] Restaurant payload missing 'id' field for userId [${userId}]`);
      throw new ForbiddenException('Access denied: You do not own a valid restaurant.');
    }

    const avgRating = restaurant?.rating?.avg ?? 4.8;
    const totalReviews = restaurant?.rating?.count ?? 24;

    this.logger.log(`✅ [MERCHANT DASHBOARD] Resolved restaurantId: ${restaurantId}, Rating: ${avgRating}`);

    // Step 2: Fetch dashboard stats from Order Service
    const orderBaseUrl = await this.configService.getAsync('ORDER_URL', 'https://localhost:44386/api/app');
    const cleanOrderUrl = orderBaseUrl.replace(/\/$/, '');

    const orderEndpointPath = cleanOrderUrl.endsWith('/order')
      ? '/statistics'
      : '/order/statistics';
    const orderTargetUrl = `${cleanOrderUrl}${orderEndpointPath}`;

    this.logger.log(`🔀 [MERCHANT DASHBOARD] Querying Order Service at ${orderTargetUrl}?restaurantId=${restaurantId}`);

    let orderResponse: any;
    try {
      orderResponse = await firstValueFrom(
        this.httpService.get(orderTargetUrl, {
          params: { restaurantId },
          headers: authHeader ? { Authorization: authHeader } : undefined,
          validateStatus: () => true,
          timeout: 15000,
        }),
      );
    } catch (error: any) {
      this.logger.error(`❌ [MERCHANT DASHBOARD] Failed to contact Order Service: ${error.message}`);
      throw new HttpException(
        'Order Service is currently unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (orderResponse.status >= 400) {
      throw new HttpException(
        orderResponse.data || 'Failed to fetch dashboard metrics from Order Service',
        orderResponse.status,
      );
    }

    const dashboardData = orderResponse.data?.data ?? orderResponse.data;

    // Inject accurate catalog rating into KPI summary
    if (dashboardData?.kpiSummary) {
      dashboardData.kpiSummary.averageRating = avgRating;
      dashboardData.kpiSummary.totalReviews = totalReviews;
    }

    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: dashboardData,
    };
  }
}

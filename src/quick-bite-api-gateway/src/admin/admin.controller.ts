import { Controller, Get, Post, Req, Query, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';

@Controller(['admin', 'api/admin'])
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * GET /api/admin/stats/overview
   * Returns totalActiveRestaurants, todayOrders, and totalSystemRevenue (Cached).
   * Pass ?refresh=true to bypass cache and recalculate.
   */
  @Get('stats/overview')
  async getOverviewStats(
    @Req() req: Request,
    @Query('refresh') refresh?: string,
  ) {
    const user = (req as any).user;
    this.adminService.validateAdminRole(user);

    const authHeader = req.headers.authorization;
    const forceRefresh = refresh === 'true' || refresh === '1';
    return this.adminService.getOverviewStats(authHeader, forceRefresh);
  }

  /**
   * GET /api/admin/stats/charts
   * Returns 30-day revenue chart and order status distribution (Cached).
   * Pass ?refresh=true to bypass cache and recalculate.
   */
  @Get('stats/charts')
  async getChartsData(
    @Req() req: Request,
    @Query('refresh') refresh?: string,
  ) {
    const user = (req as any).user;
    this.adminService.validateAdminRole(user);

    const authHeader = req.headers.authorization;
    const forceRefresh = refresh === 'true' || refresh === '1';
    return this.adminService.getChartsData(authHeader, forceRefresh);
  }

  /**
   * POST /api/admin/stats/reset-cache (or POST /api/admin/stats/refresh)
   * Explicitly clears Redis cache for admin analytics and computes fresh data.
   */
  @Post(['stats/reset-cache', 'stats/refresh'])
  async resetStatsCache(@Req() req: Request) {
    const user = (req as any).user;
    this.adminService.validateAdminRole(user);

    const authHeader = req.headers.authorization;
    return this.adminService.resetAndRefreshStatsCache(authHeader);
  }

  /**
   * GET /api/admin/reports/charts
   * Returns filtered revenue and stacked order volume charts (Globally Cached)
   */
  @Get('reports/charts')
  async getReportsCharts(
    @Req() req: Request,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('merchantId') merchantId?: string,
    @Query('restaurantId') restaurantId?: string,
  ) {
    const user = (req as any).user;
    this.adminService.validateAdminRole(user);

    const authHeader = req.headers.authorization;
    return this.adminService.getReportsCharts(
      { startDate, endDate, status, merchantId, restaurantId },
      authHeader,
    );
  }

  /**
   * GET /api/admin/reports/details
   * Returns paginated order details table data matching filter criteria (Globally Cached)
   */
  @Get('reports/details')
  async getReportsDetails(
    @Req() req: Request,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('merchantId') merchantId?: string,
    @Query('restaurantId') restaurantId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = (req as any).user;
    this.adminService.validateAdminRole(user);

    const authHeader = req.headers.authorization;
    return this.adminService.getReportsDetails(
      {
        startDate,
        endDate,
        status,
        merchantId,
        restaurantId,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      },
      authHeader,
    );
  }

  /**
   * GET /api/admin/users
   * Returns aggregated paginated user list with roles (Globally Cached)
   */
  @Get('users')
  async getAdminUsers(
    @Req() req: Request,
    @Query('skipCount') skipCount?: string,
    @Query('maxResultCount') maxResultCount?: string,
    @Query('filter') filter?: string,
  ) {
    const user = (req as any).user;
    this.adminService.validateAdminRole(user);

    const authHeader = req.headers.authorization;
    return this.adminService.getAdminUsers(
      {
        skipCount: skipCount ? parseInt(skipCount, 10) : 0,
        maxResultCount: maxResultCount ? parseInt(maxResultCount, 10) : 50,
        filter,
      },
      authHeader,
    );
  }
}



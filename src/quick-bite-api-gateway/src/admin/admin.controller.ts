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
}

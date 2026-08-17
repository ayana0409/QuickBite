import { Controller, Get, Req, Query, UseGuards, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantService } from './merchant.service';
import { GetMerchantOrdersQueryDto } from './dto/get-merchant-orders.query.dto';

@Controller(['merchant', 'api/merchant'])
@UseGuards(JwtAuthGuard)
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  /**
   * GET /api/merchant/orders
   * Secure endpoint for merchants to retrieve orders for their restaurant without specifying restaurantId.
   */
  @Get('orders')
  async getMerchantOrders(
    @Req() req: Request,
    @Query() query: GetMerchantOrdersQueryDto,
  ) {
    const user = (req as any).user;
    const userId = user?.sub || user?.id;

    if (!userId) {
      throw new UnauthorizedException('Invalid JWT payload: Missing user ID claim');
    }

    const authHeader = req.headers.authorization;
    return this.merchantService.getMerchantOrders(userId, query, authHeader);
  }

  /**
   * GET /api/merchant/dashboard
   * Aggregated dashboard analytics for the authenticated merchant's restaurant.
   */
  @Get('dashboard')
  async getMerchantDashboard(@Req() req: Request) {
    const user = (req as any).user;
    const userId = user?.sub || user?.id;

    if (!userId) {
      throw new UnauthorizedException('Invalid JWT payload: Missing user ID claim');
    }

    const authHeader = req.headers.authorization;
    return this.merchantService.getMerchantDashboard(userId, authHeader);
  }
}

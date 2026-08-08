import { Controller, All, Req, Res, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { Request, Response } from 'express';
import { DynamicConfigService } from '../config/dynamic-config.service';
import { firstValueFrom } from 'rxjs';

@Controller()
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: DynamicConfigService,
  ) {}

  @All('identity{*path}')
  async proxyIdentity(@Req() req: Request, @Res() res: Response) {
    await this.forwardRequest('IDENTITY_URL', req, res);
  }

  @All('order{*path}')
  async proxyOrder(@Req() req: Request, @Res() res: Response) {
    await this.forwardRequest('ORDER_URL', req, res);
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

  @All('inventory{*path}')
  async proxyInventory(@Req() req: Request, @Res() res: Response) {
    await this.forwardRequest('INVENTORY_URL', req, res);
  }

  @All('payments{*path}')
  async proxyPayment(@Req() req: Request, @Res() res: Response) {
    await this.forwardRequest('PAYMENT_URL', req, res);
  }

  private async forwardRequest(targetConfigKey: string, req: Request, res: Response) {
    const targetBaseUrl = await this.configService.getAsync(targetConfigKey);

    if (!targetBaseUrl) {
      this.logger.warn(`Service URL for ${targetConfigKey} is not configured.`);
      res.status(503).json({
        statusCode: 503,
        message: `Service URL for ${targetConfigKey} is not configured in Gateway environment.`,
      });
      return;
    }

    const targetUrl = `${targetBaseUrl.replace(/\/$/, '')}${req.originalUrl}`;

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: req.method,
          url: targetUrl,
          data: req.body,
          headers: {
            ...req.headers,
            host: undefined,
          },
          validateStatus: () => true,
        }),
      );

      res.status(response.status).set(response.headers).send(response.data);
    } catch (error: any) {
      this.logger.error(`Error proxying request to ${targetUrl}: ${error.message}`);
      res.status(502).json({
        statusCode: 502,
        message: `Bad Gateway: Unable to connect to downstream service at ${targetUrl}`,
      });
    }
  }
}

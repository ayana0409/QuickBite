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

  @All('inventory{*path}')
  async proxyInventory(@Req() req: Request, @Res() res: Response) {
    await this.forwardRequest('INVENTORY_URL', req, res);
  }

  @All('payments{*path}')
  async proxyPayment(@Req() req: Request, @Res() res: Response) {
    await this.forwardRequest('PAYMENT_URL', req, res);
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

    // Strip prefix if request contains /catalog, /identity, /order, /inventory, /payments
    const relativePath = req.originalUrl.replace(/^\/(catalog|identity|order|inventory|payments)/, '');
    const cleanBaseUrl = targetBaseUrl.replace(/\/$/, '');
    
    // Ensure relativePath starts with /
    const formattedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    const targetUrl = `${cleanBaseUrl}${formattedPath}`;

    if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
      this.logger.log(`🔀 [PROXY FORWARD] ${req.method} ${req.originalUrl} -> ${targetUrl} | BODY: ${JSON.stringify(req.body)}`);
    } else {
      this.logger.log(`🔀 [PROXY FORWARD] ${req.method} ${req.originalUrl} -> ${targetUrl}`);
    }

    const maxAttempts = 3;
    let lastResponse: any = null;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.request({
            method: req.method,
            url: targetUrl,
            data: req.body,
            headers: {
              ...req.headers,
              host: undefined,
              'content-length': undefined, // Bắt buộc xoá để Axios tự tính lại length, tránh lỗi 400 Bad Request JSON
            },
            validateStatus: () => true, // Accept all status codes to inspect Render 502/503 HTML
            timeout: 15000,
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

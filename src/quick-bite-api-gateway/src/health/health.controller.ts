import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';
import { HealthResponseDto } from './dto/health-check-response.dto';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get(['health', 'api/health'])
  async getHealth(@Res() res: Response): Promise<void> {
    const result: HealthResponseDto = await this.healthService.checkHealth();
    const statusCode = result.status === 'Unhealthy' ? 503 : 200;
    res.status(statusCode).json(result);
  }
}

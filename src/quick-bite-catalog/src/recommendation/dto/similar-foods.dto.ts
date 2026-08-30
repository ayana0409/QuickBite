import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// DTO for GET /recommendations/similar-foods/:foodId query parameters
export class SimilarFoodsQueryDto {
  @ApiPropertyOptional({ description: 'Max number of similar food items to return', example: 8, default: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 8;
}

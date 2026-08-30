import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// DTO for GET /recommendations/nearby query parameters
export class NearbyQueryDto {
  @ApiProperty({ description: 'User latitude', example: 10.776 })
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @ApiProperty({ description: 'User longitude', example: 106.700 })
  @Type(() => Number)
  @IsNumber()
  lng!: number;

  @ApiPropertyOptional({ description: 'Search radius in meters', example: 5000, default: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  @Max(50000)
  radius?: number = 5000;

  @ApiPropertyOptional({ description: 'Number of results', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

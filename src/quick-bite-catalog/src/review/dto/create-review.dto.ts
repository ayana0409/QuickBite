import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReviewItemDto {
  @IsString()
  @IsNotEmpty()
  foodItemId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  comment?: string;
}

export class CreateBatchReviewDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsString()
  @IsNotEmpty()
  restaurantId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewItemDto)
  items!: ReviewItemDto[];
}

export class CreateReviewDto extends CreateBatchReviewDto {}

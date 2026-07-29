import {
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { FoodVariantDto } from './food-variant.dto';

export class UpdateFoodItemVariantsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FoodVariantDto)
  variants!: FoodVariantDto[];
}
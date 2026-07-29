import {
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { FoodToppingDto } from './food-topping.dto';

export class UpdateFoodItemToppingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FoodToppingDto)
  toppings!: FoodToppingDto[];
}
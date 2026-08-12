import { FoodTopping, FoodVariant } from '../entities/food-item.entity';

export class FoodItemUpdatedEto {
  id: string;
  name: string;
  categoryId: string;
  restaurantId: string;
  price: number;
  variants: FoodVariant[] = [];
  toppings: FoodTopping[] = [];

  constructor(partial?: Partial<FoodItemUpdatedEto>) {
    Object.assign(this, partial);
  }
}

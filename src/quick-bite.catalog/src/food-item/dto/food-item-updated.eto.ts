export class FoodItemUpdatedEto {
  id: string;
  name: string;
  price: number;

  constructor(partial?: Partial<FoodItemUpdatedEto>) {
    Object.assign(this, partial);
  }
}

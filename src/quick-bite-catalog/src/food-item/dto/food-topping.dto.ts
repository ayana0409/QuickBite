import { IsNumber, IsString } from 'class-validator';

export class FoodToppingDto {
  @IsString()
  name!: string;

  @IsNumber()
  price!: number;
}
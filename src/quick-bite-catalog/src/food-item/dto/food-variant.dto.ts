import { IsNumber, IsString } from 'class-validator';

export class FoodVariantDto {
  @IsString()
  name!: string;

  @IsNumber()
  priceDelta!: number;
}
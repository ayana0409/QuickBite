    import {
  ArrayUnique,
  IsArray,
  IsString,
} from 'class-validator';

export class UpdateFoodItemImagesDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  images!: string[];
}
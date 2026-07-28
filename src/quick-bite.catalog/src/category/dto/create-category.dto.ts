import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateCategoryDto {
    @ApiProperty({
        example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        description: 'Restaurant ID',
    })
    @IsUUID()
    restaurantId!: string;

    @ApiProperty({
        example: 'Pizza',
        description: 'Category name',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;

    @ApiProperty({
        example: 1,
        description: 'Display order of the category',
        default: 0,
    })
    @IsInt()
    @Min(0)
    sortOrder!: number;
}
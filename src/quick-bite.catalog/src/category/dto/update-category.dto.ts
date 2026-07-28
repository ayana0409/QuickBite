import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsInt, Min } from 'class-validator';

export class UpdateCategoryDto {
    @ApiProperty({
        example: 'Pizza',
        description: 'Category name',
    })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    name!: string;

    @ApiProperty({
        example: 1,
        description: 'Display order of the category',
        default: 0,
    })
    @IsInt()
    @IsOptional()
    @Min(0)
    sortOrder!: number;
}

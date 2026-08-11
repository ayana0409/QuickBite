import { Type } from 'class-transformer';
import {
    IsArray,
    ArrayMinSize,
    ArrayMaxSize,
    IsString,
    IsUUID,
    ValidateNested,
} from 'class-validator';

class GeoDto {
    @IsString()
    type!: string;

    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(2)
    coordinates!: [number, number];
}

class AddressDto {
    @IsString()
    line1!: string;

    @IsString()
    ward!: string;

    @IsString()
    district!: string;

    @IsString()
    city!: string;

    @ValidateNested()
    @Type(() => GeoDto)
    geo!: GeoDto;
}

export class CreateRestaurantDto {
    @IsString()
    ownerId!: string;

    @IsString()
    name!: string;

    @IsString()
    slug!: string;

    @ValidateNested()
    @Type(() => AddressDto)
    address!: AddressDto;
}
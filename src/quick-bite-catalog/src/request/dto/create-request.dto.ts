import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequestType } from '../enums/request.enum';
import { CatalogRequestPayload } from '../entities/catalog-request.entity';

export class RequestGeoDto {
  @ApiProperty({ example: 'Point' })
  @IsString()
  type!: string;

  @ApiProperty({ example: [106.660172, 10.762622], description: '[longitude, latitude]' })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  coordinates!: [number, number];
}

export class RequestAddressDto {
  @ApiProperty({ example: '123 Nguyen Trai Street' })
  @IsString()
  @IsNotEmpty()
  line1!: string;

  @ApiProperty({ example: 'Ward 2' })
  @IsString()
  @IsNotEmpty()
  ward!: string;

  @ApiProperty({ example: 'District 5' })
  @IsString()
  @IsNotEmpty()
  district!: string;

  @ApiProperty({ example: 'Ho Chi Minh City' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ type: () => RequestGeoDto })
  @ValidateNested()
  @Type(() => RequestGeoDto)
  geo!: RequestGeoDto;
}

export class RestaurantRegistrationPayloadDto {
  @ApiPropertyOptional({ description: 'Optional owner ID (defaults to authenticated user UUID)' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({ example: 'Pho 24' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'pho-24-district-5' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiProperty({ type: () => RequestAddressDto })
  @ValidateNested()
  @Type(() => RequestAddressDto)
  address!: RequestAddressDto;
}

export class FoodReportPayloadDto {
  @ApiProperty({ example: '4c65e8a1-b8ef-4ef2-bb17-8e6ca6fbf199' })
  @IsUUID('4')
  @IsNotEmpty()
  foodItemId!: string;

  @ApiProperty({ example: 'INAPPROPRIATE_CONTENT' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional({ example: 'The image does not match the actual food delivered.' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class SystemFeedbackPayloadDto {
  @ApiProperty({ example: 'App Performance' })
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiProperty({ example: 'The menu search screen takes too long to load.' })
  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class CreateRequestDto {
  @ApiProperty({
    enum: RequestType,
    example: RequestType.RESTAURANT_REGISTRATION,
    description: 'Type of the request being created',
  })
  @IsEnum(RequestType)
  @IsNotEmpty()
  type!: RequestType;

  @ApiProperty({
    description: 'Request payload containing type-specific data (e.g., restaurant registration details)',
    example: {
      name: 'Pho 24',
      slug: 'pho-24-district-5',
      address: {
        line1: '123 Nguyen Trai Street',
        ward: 'Ward 2',
        district: 'District 5',
        city: 'Ho Chi Minh City',
        geo: {
          type: 'Point',
          coordinates: [106.660172, 10.762622],
        },
      },
    },
  })
  @IsObject()
  @IsNotEmpty()
  payload!: CatalogRequestPayload;
}

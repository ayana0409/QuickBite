import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequestAction } from '../enums/request.enum';

export class ProcessRequestDto {
  @ApiProperty({
    enum: RequestAction,
    example: RequestAction.APPROVE,
    description: 'Processing action (APPROVE, REJECT, RESOLVE)',
  })
  @IsEnum(RequestAction)
  @IsNotEmpty()
  action!: RequestAction;

  @ApiPropertyOptional({
    example: 'Restaurant registration approved after verifying merchant documents.',
    description: 'Optional note explaining the action taken by the administrator',
  })
  @IsOptional()
  @IsString()
  adminNote?: string;
}

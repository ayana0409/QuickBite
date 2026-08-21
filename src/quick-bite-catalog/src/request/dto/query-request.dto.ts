import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { RequestStatus, RequestType } from '../enums/request.enum';

export class QueryRequestDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: RequestStatus,
    description: 'Filter requests by status',
  })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @ApiPropertyOptional({
    enum: RequestType,
    description: 'Filter requests by type',
  })
  @IsOptional()
  @IsEnum(RequestType)
  type?: RequestType;

  @ApiPropertyOptional({
    description: 'Filter requests by requester user UUID',
  })
  @IsOptional()
  @IsUUID('4')
  userId?: string;
}

import { PaginationDto } from "@/common/dto/pagination.dto";
import { IsOptional } from "class-validator";

export class GetRestaurantsDto extends PaginationDto {

    @IsOptional()
    name?: string;

    @IsOptional()
    city?: string;
}
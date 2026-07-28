import { PaginationDto } from "@/common/dto/pagination.dto";
import { IsOptional } from "class-validator";

export class GetCategoryDto extends PaginationDto {

    @IsOptional()
    name?: string;
}
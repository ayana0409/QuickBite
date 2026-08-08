import { Repository, FindManyOptions, ObjectLiteral } from "typeorm";
import { PaginationDto } from "../dto/pagination.dto";

export class PaginationHelper {

    static async paginate<T extends ObjectLiteral>(
        repository: Repository<T>,
        pagination: PaginationDto,
        options?: FindManyOptions<T>,
    ) {

        const [data, total] =
            await repository.findAndCount({
                ...options,
                skip:
                    (pagination.page - 1)
                    * pagination.limit,
                take: pagination.limit,
            });


        return {
            data,
            meta: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                totalPages:
                    Math.ceil(
                        total / pagination.limit,
                    ),
            },
        };
    }
}
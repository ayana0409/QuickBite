import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    HttpStatus,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class ResponseInterceptor<T>
    implements NestInterceptor<T, any>
{
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<any> {
        const ctx = context.switchToHttp();

        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        return next.handle().pipe(
            map((data) => ({
                success: true,
                statusCode: response.statusCode,
                message: 'Success.',
                data,
                timestamp: new Date().toISOString(),
                path: request.url,
            })),
        );
    }
}
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {

    constructor(
        private readonly reflector: Reflector,
    ) {}

    canActivate(
        context: ExecutionContext,
    ): boolean {
        if (process.env.BYPASS_AUTH === 'true') {
            return true;
        }

        const requiredPermissions =
            this.reflector.getAllAndOverride<string[]>(
                PERMISSIONS_KEY,
                [
                    context.getHandler(),
                    context.getClass(),
                ],
            );


        // Endpoint không yêu cầu permission
        if (!requiredPermissions) {
            return true;
        }


        const request =
            context.switchToHttp()
                .getRequest();


        const user =
            request.user;


        if (!user) {
            throw new ForbiddenException(
                'Access Denied',
            );
        }


        const userPermissions =
            user.permissions ?? [];


        const hasPermission =
            requiredPermissions.every(
                permission =>
                    userPermissions.includes(permission),
            );


        if (!hasPermission) {
            throw new ForbiddenException(
                'Permission denied',
            );
        }


        return true;
    }
}
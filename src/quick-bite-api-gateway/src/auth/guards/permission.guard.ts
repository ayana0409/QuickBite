import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * Guard that verifies user permissions against required endpoint permissions
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (process.env.BYPASS_AUTH === 'true') {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Endpoint does not require permission
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('[PermissionGuard] JWT User payload:', JSON.stringify(user, null, 2));

    if (!user) {
      throw new ForbiddenException('Access Denied');
    }

    const rawPermissions = user.permissions ?? user.permission ?? user.role ?? user.roles ?? [];
    let userPermissions: string[] = [];
    
    if (Array.isArray(rawPermissions)) {
      userPermissions = rawPermissions;
    } else if (typeof rawPermissions === 'string') {
      try {
        const parsed = JSON.parse(rawPermissions);
        if (Array.isArray(parsed)) {
          userPermissions = parsed;
        } else {
          userPermissions = [rawPermissions];
        }
      } catch {
        // Handle comma or space separated strings
        userPermissions = rawPermissions.split(/[,\s]+/).filter(Boolean);
      }
    }

    console.log('[PermissionGuard] Required permissions:', requiredPermissions);
    console.log('[PermissionGuard] User raw permissions:', rawPermissions);
    console.log('[PermissionGuard] User resolved permissions:', userPermissions);

    const hasPermission = requiredPermissions.every((required) =>
      userPermissions.some(
        (userPerm) =>
          userPerm === required ||
          userPerm.toLowerCase() === required.toLowerCase(),
      ),
    );

    console.log('[PermissionGuard] Has permission?', hasPermission);

    if (!hasPermission) {
      throw new ForbiddenException(`Permission denied. Required: ${requiredPermissions.join(', ')}`);
    }

    return true;
  }
}

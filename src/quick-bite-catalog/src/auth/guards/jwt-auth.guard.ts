import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    if (process.env.BYPASS_AUTH === 'true') {
      const request = context.switchToHttp().getRequest();
      request.user = {
        sub: 'dev-user-id',
        username: 'dev-user',
        permissions: ['*'],
      };
      return true;
    }
    return super.canActivate(context);
  }
}
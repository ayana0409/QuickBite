import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that verifies JWT bearer tokens using Passport JWT strategy
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(err: any, user: any, info: any, context: any) {
    if (err || !user) {
      this.logger.error(
        `❌ JWT Validation failed! Error: ${err ? JSON.stringify(err) : 'null'} | Info: ${info ? (info.message || info) : 'null'}`
      );
      throw err || new UnauthorizedException(info ? info.message : 'Invalid token');
    }
    return user;
  }
}

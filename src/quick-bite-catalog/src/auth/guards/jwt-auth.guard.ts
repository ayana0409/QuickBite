import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Trích xuất trực tiếp payload từ Token JWT thực tế trong header Authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const decodedPayload = JSON.parse(
            Buffer.from(payloadBase64, 'base64').toString('utf8'),
          );
          request.user = decodedPayload;
        }
      } catch (err) {
        console.error('Failed to parse JWT payload:', err);
      }
    }

    if (process.env.BYPASS_AUTH === 'true') {
      if (!request.user) {
        throw new UnauthorizedException('Missing or invalid Authorization Bearer token');
      }
      return true;
    }

    return super.canActivate(context);
  }
}
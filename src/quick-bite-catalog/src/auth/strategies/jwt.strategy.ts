import { Injectable, Optional } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@Optional() private readonly configService?: ConfigService) {
    const identityUrl =
      configService?.get<string>('IDENTITY_SERVICE_URL') ||
      configService?.get<string>('IDENTITY_URL') ||
      process.env.IDENTITY_SERVICE_URL ||
      process.env.IDENTITY_URL ||
      'http://localhost:44391';

    const jwksUri =
      configService?.get<string>('JWKS_URI') ||
      process.env.JWKS_URI ||
      `${identityUrl.replace(/\/$/, '')}/.well-known/jwks`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri,
      }),
    });
  }

  validate(payload: any) {
    return payload;
  }
}
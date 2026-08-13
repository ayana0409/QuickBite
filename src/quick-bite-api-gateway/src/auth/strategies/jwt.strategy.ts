import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

/**
 * Passport strategy to extract and validate JWT tokens via JWKS endpoint
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    const identityUrl = process.env.IDENTITY_URL || 'http://localhost:44391';
    const jwksUri =
      process.env.JWKS_URI ||
      `${identityUrl.replace(/\/$/, '')}/.well-known/jwks`;

    // Log the resolved configuration
    console.log(`[JwtStrategy] Initialized with Identity URL: ${identityUrl}`);
    console.log(`[JwtStrategy] Fetching JWKS from: ${jwksUri}`);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri,
        handleSigningKeyError: (err, cb) => {
          console.error(`[JwtStrategy] JWKS Fetch/Match Error:`, err);
          if (err && err.name === 'SigningKeyNotFoundError') {
            return cb(null); // passport-jwt expects null to return the correct error
          }
          return cb(err);
        },
      }),
    });
  }

  /**
   * Validate decoded JWT payload and attach to request
   */
  validate(payload: any) {
    return payload;
  }
}

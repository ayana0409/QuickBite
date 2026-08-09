import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that verifies JWT bearer tokens using Passport JWT strategy
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

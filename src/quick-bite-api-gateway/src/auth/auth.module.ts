import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PermissionGuard } from './guards/permission.guard';

/**
 * Module providing JWT authentication and permission authorization services
 */
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [JwtStrategy, PermissionGuard],
  exports: [PassportModule, JwtStrategy, PermissionGuard],
})
export class AuthModule {}

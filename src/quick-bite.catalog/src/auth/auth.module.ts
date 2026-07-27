import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionGuard } from './guards/permission.guard';
import { PassportModule } from '@nestjs/passport/dist/passport.module';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
    providers: [
        PermissionGuard,
    ],
    exports:[
        PermissionGuard,
    ],
})
export class AuthModule {}

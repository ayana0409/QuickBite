import { Module } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { RestaurantController } from './restaurant.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { AuthModule } from '@/auth/auth.module';
import { JwtStrategy } from '@/auth/strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
      TypeOrmModule.forFeature([Restaurant]),
      PassportModule.register({
    defaultStrategy:'jwt'
 })
  ],
  controllers: [RestaurantController],
  providers: [RestaurantService,
 JwtStrategy],
})
export class RestaurantModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestService } from './request.service';
import { RequestController } from './request.controller';
import { CatalogRequest } from './entities/catalog-request.entity';
import { Restaurant } from '../restaurant/entities/restaurant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogRequest, Restaurant])],
  controllers: [RequestController],
  providers: [RequestService],
  exports: [RequestService],
})
export class RequestModule {}

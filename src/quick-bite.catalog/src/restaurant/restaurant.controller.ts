import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { RestaurantService } from './restaurant.service';

import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('restaurants')
export class RestaurantController {
  constructor(
    private readonly restaurantService: RestaurantService,
  ) {}

  @Post()
  create(
    @Body() createRestaurantDto: CreateRestaurantDto,
  ) {
    return this.restaurantService.create(
      createRestaurantDto,
    );
  }

  @Get()
  findAll(
    @Query() pagination: PaginationDto,
  ) {
    return this.restaurantService.findAll(
      pagination,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.restaurantService.findOne(
      id,
    );
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
  ) {
    return this.restaurantService.update(
      id,
      updateRestaurantDto,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.restaurantService.remove(
      id,
    );
  }
}
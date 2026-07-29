import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Restaurant } from './entities/restaurant.entity';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationHelper } from '../common/helpers/pagination.helper';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
  ) { }

  async create(
    createRestaurantDto: CreateRestaurantDto,
  ): Promise<Restaurant> {

    const existedRestaurant =
      await this.restaurantRepository.findOne({
        where: {
          slug: createRestaurantDto.slug,
        },
      });

    if (existedRestaurant) {
      throw new ConflictException(
        'Restaurant slug already exists.',
      );
    }

    const restaurant = this.restaurantRepository.create({
    ownerId: createRestaurantDto.ownerId,
    name: createRestaurantDto.name,
    slug: createRestaurantDto.slug,
    address: {
        line1: createRestaurantDto.address.line1,
        ward: createRestaurantDto.address.ward,
        district: createRestaurantDto.address.district,
        city: createRestaurantDto.address.city,
        geo: {
            type: 'Point',
            coordinates: createRestaurantDto.address.geo.coordinates,
        },
    },
});

    return await this.restaurantRepository.save(
      restaurant,
    );
  }

  async findAll(
    pagination: PaginationDto,
  ) {

    return PaginationHelper.paginate(
      this.restaurantRepository,
      pagination,
    );
  }

  async findOne(
    id: string,
  ): Promise<Restaurant> {
    const restaurant = await this.restaurantRepository
      .createQueryBuilder("restaurant")
      .leftJoinAndSelect("restaurant.categories", "category")
      .select([
        "restaurant.id",
        "restaurant.name",
        "category.id",
        "category.name"
      ])
      .where("restaurant.id = :id", { id })
      .getOne();


    if (!restaurant) {
      throw new NotFoundException(
        'Restaurant not found.',
      );
    }

    return restaurant;
  }

  async update(
    id: string,
    updateRestaurantDto: UpdateRestaurantDto,
  ): Promise<Restaurant> {

    const restaurant =
      await this.findOne(id);


    if (
      updateRestaurantDto.slug &&
      updateRestaurantDto.slug !== restaurant.slug
    ) {

      const existedRestaurant =
        await this.restaurantRepository.findOne({
          where: {
            slug: updateRestaurantDto.slug,
          },
        });

      if (existedRestaurant) {
        throw new ConflictException(
          'Restaurant slug already exists.',
        );
      }
    }

    Object.assign(
      restaurant,
      updateRestaurantDto,
    );

    return await this.restaurantRepository.save(
      restaurant,
    );
  }

  async remove(
    id: string,
  ): Promise<void> {

    const restaurant =
      await this.findOne(id);

    await this.restaurantRepository.remove(
      restaurant,
    );
  }
}
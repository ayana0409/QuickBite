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

  async findByOwner(ownerId: string): Promise<Restaurant | null> {
    if (!ownerId || ownerId === 'undefined') {
      return null;
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(ownerId)) {
      return null;
    }

    return await this.restaurantRepository.findOne({
      where: { ownerId },
    });
  }

  async updateByOwner(
    ownerId: string,
    updateRestaurantDto: UpdateRestaurantDto,
  ): Promise<Restaurant> {
    const restaurant = await this.findByOwner(ownerId);
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found for this merchant.');
    }

    if (
      updateRestaurantDto.slug &&
      updateRestaurantDto.slug !== restaurant.slug
    ) {
      const existedRestaurant = await this.restaurantRepository.findOne({
        where: {
          slug: updateRestaurantDto.slug,
        },
      });

      if (existedRestaurant && existedRestaurant.id !== restaurant.id) {
        throw new ConflictException('Restaurant slug already exists.');
      }
    }

    if (updateRestaurantDto.address) {
      const geoData = updateRestaurantDto.address.geo
        ? {
            type: 'Point' as const,
            coordinates: updateRestaurantDto.address.geo.coordinates,
          }
        : restaurant.address?.geo ?? {
            type: 'Point' as const,
            coordinates: [106.660172, 10.762622] as [number, number],
          };

      restaurant.address = {
        ...restaurant.address,
        ...updateRestaurantDto.address,
        geo: geoData,
      };
      delete (updateRestaurantDto as any).address;
    }

    Object.assign(restaurant, updateRestaurantDto);

    return await this.restaurantRepository.save(restaurant);
  }

  async findOne(
    id: string,
  ): Promise<Restaurant> {
    const restaurant = await this.restaurantRepository
      .createQueryBuilder("restaurant")
      .leftJoinAndSelect("restaurant.categories", "category")
      .select([
        "restaurant.id",
        "restaurant.ownerId",
        "restaurant.name",
        "restaurant.slug",
        "restaurant.address",
        "restaurant.status",
        "restaurant.rating",
        "restaurant.createdAt",
        "restaurant.updatedAt",
        "category.id",
        "category.name",
        "category.sortOrder",
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
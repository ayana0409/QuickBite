import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RestaurantService } from './restaurant.service';
import { Restaurant } from './entities/restaurant.entity';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

describe('RestaurantService', () => {
  let service: RestaurantService;
  let repository: jest.Mocked<Repository<Restaurant>>;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockRestaurantRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockRestaurant: Restaurant = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    ownerId: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Restaurant',
    slug: 'test-restaurant',
    address: {
      line1: '123 Main St',
      ward: 'Ward 1',
      district: 'District 1',
      city: 'Hanoi',
      geo: {
        type: 'Point',
        coordinates: [105.854444, 21.028511],
      },
    },
    status: 'closed',
    rating: { avg: 0, count: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
    categories: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantService,
        {
          provide: getRepositoryToken(Restaurant),
          useValue: mockRestaurantRepository,
        },
      ],
    }).compile();

    service = module.get<RestaurantService>(RestaurantService);
    repository = module.get(getRepositoryToken(Restaurant));

    jest.clearAllMocks();
    mockRestaurantRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateRestaurantDto = {
      ownerId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Test Restaurant',
      slug: 'test-restaurant',
      address: {
        line1: '123 Main St',
        ward: 'Ward 1',
        district: 'District 1',
        city: 'Hanoi',
        geo: {
          type: 'Point',
          coordinates: [105.854444, 21.028511],
        },
      },
    };

    it('should create and return a restaurant when slug is unique', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockRestaurant);
      repository.save.mockResolvedValue(mockRestaurant);

      const result = await service.create(createDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { slug: createDto.slug },
      });
      expect(repository.create).toHaveBeenCalledWith({
        ownerId: createDto.ownerId,
        name: createDto.name,
        slug: createDto.slug,
        address: {
          line1: createDto.address.line1,
          ward: createDto.address.ward,
          district: createDto.address.district,
          city: createDto.address.city,
          geo: {
            type: 'Point',
            coordinates: createDto.address.geo.coordinates,
          },
        },
      });
      expect(repository.save).toHaveBeenCalledWith(mockRestaurant);
      expect(result).toEqual(mockRestaurant);
    });

    it('should throw ConflictException if restaurant slug already exists', async () => {
      repository.findOne.mockResolvedValue(mockRestaurant);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { slug: createDto.slug },
      });
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated restaurants', async () => {
      const paginationDto = { page: 1, limit: 10 };
      repository.findAndCount.mockResolvedValue([[mockRestaurant], 1]);

      const result = await service.findAll(paginationDto);

      expect(repository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        data: [mockRestaurant],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a restaurant when found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockRestaurant);

      const result = await service.findOne(mockRestaurant.id);

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('restaurant');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'restaurant.categories',
        'category',
      );
      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        'restaurant.id',
        'restaurant.ownerId',
        'restaurant.name',
        'restaurant.slug',
        'restaurant.address',
        'restaurant.status',
        'restaurant.rating',
        'restaurant.createdAt',
        'restaurant.updatedAt',
        'category.id',
        'category.name',
        'category.sortOrder',
      ]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('restaurant.id = :id', {
        id: mockRestaurant.id,
      });
      expect(mockQueryBuilder.getOne).toHaveBeenCalled();
      expect(result).toEqual(mockRestaurant);
    });

    it('should throw NotFoundException when restaurant is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateRestaurantDto = {
      name: 'Updated Restaurant Name',
    };

    it('should update and return the restaurant when slug is not changed', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ ...mockRestaurant });
      repository.save.mockImplementation(async (entity) => entity as Restaurant);

      const result = await service.update(mockRestaurant.id, updateDto);

      expect(repository.save).toHaveBeenCalled();
      expect(result.name).toEqual('Updated Restaurant Name');
    });

    it('should update successfully when slug is changed to a unique slug', async () => {
      const updateWithNewSlug: UpdateRestaurantDto = {
        slug: 'new-restaurant-slug',
      };

      mockQueryBuilder.getOne.mockResolvedValue({ ...mockRestaurant });
      repository.findOne.mockResolvedValue(null);
      repository.save.mockImplementation(async (entity) => entity as Restaurant);

      const result = await service.update(mockRestaurant.id, updateWithNewSlug);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { slug: 'new-restaurant-slug' },
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result.slug).toEqual('new-restaurant-slug');
    });

    it('should throw ConflictException when updating slug to an existing slug', async () => {
      const updateWithTakenSlug: UpdateRestaurantDto = {
        slug: 'existing-slug',
      };

      mockQueryBuilder.getOne.mockResolvedValue({ ...mockRestaurant });
      repository.findOne.mockResolvedValue({
        ...mockRestaurant,
        id: 'other-id',
        slug: 'existing-slug',
      });

      await expect(
        service.update(mockRestaurant.id, updateWithTakenSlug),
      ).rejects.toThrow(ConflictException);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { slug: 'existing-slug' },
      });
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if restaurant to update does not exist', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a restaurant successfully when found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockRestaurant);
      repository.remove.mockResolvedValue(mockRestaurant);

      await service.remove(mockRestaurant.id);

      expect(repository.remove).toHaveBeenCalledWith(mockRestaurant);
    });

    it('should throw NotFoundException if restaurant to remove does not exist', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });
});

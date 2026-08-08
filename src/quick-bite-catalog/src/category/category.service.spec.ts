import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CategoryService } from './category.service';
import { Category } from './entities/category.entity';
import { Restaurant } from '@/restaurant/entities/restaurant.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

describe('CategoryService', () => {
  let service: CategoryService;
  let categoryRepository: jest.Mocked<Repository<Category>>;
  let restaurantRepository: jest.Mocked<Repository<Restaurant>>;

  const mockCategory: Category = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    restaurantId: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Category',
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    restaurant: {} as Restaurant,
  };

  const mockRestaurant: Restaurant = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    ownerId: '123e4567-e89b-12d3-a456-426614174002',
    name: 'Test Restaurant',
    slug: 'test-restaurant',
    address: {
      line1: '123 Main St',
      ward: 'Ward 1',
      district: 'District 1',
      city: 'Hanoi',
      geo: {
        type: 'Point',
        coordinates: [105.8, 21.0],
      },
    },
    status: 'open',
    rating: { avg: 0, count: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
    categories: [],
  };

  const mockCategoryRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
  };

  const mockRestaurantRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
        {
          provide: getRepositoryToken(Restaurant),
          useValue: mockRestaurantRepository,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    categoryRepository = module.get(getRepositoryToken(Category));
    restaurantRepository = module.get(getRepositoryToken(Restaurant));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateCategoryDto = {
      restaurantId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'New Category',
      sortOrder: 0,
    };

    it('should throw NotFoundException if restaurant does not exist', async () => {
      restaurantRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      expect(restaurantRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDto.restaurantId },
      });
    });

    it('should throw ConflictException if category name already exists in restaurant', async () => {
      restaurantRepository.findOne.mockResolvedValue(mockRestaurant);
      categoryRepository.findOne.mockResolvedValue(mockCategory);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: { restaurantId: createDto.restaurantId, name: createDto.name },
      });
    });

    it('should create and return a category', async () => {
      restaurantRepository.findOne.mockResolvedValue(mockRestaurant);
      categoryRepository.findOne.mockResolvedValue(null);
      categoryRepository.create.mockReturnValue(mockCategory);
      categoryRepository.save.mockResolvedValue(mockCategory);

      const result = await service.create(createDto);

      expect(categoryRepository.create).toHaveBeenCalledWith({
        restaurantId: createDto.restaurantId,
        name: createDto.name,
        sortOrder: createDto.sortOrder,
      });
      expect(categoryRepository.save).toHaveBeenCalledWith(mockCategory);
      expect(result).toEqual(mockCategory);
    });
  });

  describe('findAll', () => {
    it('should return paginated categories', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      categoryRepository.findAndCount.mockResolvedValue([[mockCategory], 1]);

      const result = await service.findAll(paginationDto);

      expect(categoryRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        data: [mockCategory],
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
    it('should return a category when found', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);

      const result = await service.findOne(mockCategory.id);

      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCategory.id },
        relations: { restaurant: true },
      });
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when category is not found', async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateCategoryDto = {
      name: 'Updated Category',
      sortOrder: 1,
    };

    it('should throw NotFoundException if category to update does not exist', async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new name already exists in the same restaurant', async () => {
      categoryRepository.findOne
        .mockResolvedValueOnce(mockCategory) // first call in findOne()
        .mockResolvedValueOnce({ ...mockCategory, id: 'other-id' } as Category); // second call for existedCategory

      await expect(service.update(mockCategory.id, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should update and return the category when valid', async () => {
      categoryRepository.findOne
        .mockResolvedValueOnce({ ...mockCategory })
        .mockResolvedValueOnce(null);
      
      categoryRepository.save.mockImplementation(async (entity) => entity as Category);

      const result = await service.update(mockCategory.id, updateDto);

      expect(categoryRepository.save).toHaveBeenCalled();
      expect(result.name).toEqual('Updated Category');
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if category to remove does not exist', async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(categoryRepository.remove).not.toHaveBeenCalled();
    });

    it('should remove category successfully when found', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);
      categoryRepository.remove.mockResolvedValue(mockCategory);

      await service.remove(mockCategory.id);

      expect(categoryRepository.remove).toHaveBeenCalledWith(mockCategory);
    });
  });
});

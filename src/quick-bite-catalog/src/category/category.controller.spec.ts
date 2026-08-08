import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';

describe('CategoryController', () => {
  let controller: CategoryController;
  let service: jest.Mocked<CategoryService>;

  const mockCategory = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    restaurantId: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Category',
    sortOrder: 1,
  };

  const mockCategoryService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CategoryController>(CategoryController);
    service = module.get(CategoryService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call categoryService.create and return result', async () => {
      const createDto: CreateCategoryDto = {
        restaurantId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'New Category',
        sortOrder: 0,
      };

      mockCategoryService.create.mockResolvedValue(mockCategory);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockCategory);
    });
  });

  describe('findAll', () => {
    it('should call categoryService.findAll and return paginated list', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const paginatedResult = {
        data: [mockCategory],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockCategoryService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(paginationDto);

      expect(service.findAll).toHaveBeenCalledWith(paginationDto);
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('findOne', () => {
    it('should call categoryService.findOne and return a category', async () => {
      mockCategoryService.findOne.mockResolvedValue(mockCategory);

      const result = await controller.findOne(mockCategory.id);

      expect(service.findOne).toHaveBeenCalledWith(mockCategory.id);
      expect(result).toEqual(mockCategory);
    });
  });

  describe('update', () => {
    it('should call categoryService.update and return updated category', async () => {
      const updateDto: UpdateCategoryDto = {
        name: 'Updated Name',
        sortOrder: 1,
      };
      const updatedCategory = { ...mockCategory, name: 'Updated Name' };

      mockCategoryService.update.mockResolvedValue(updatedCategory);

      const result = await controller.update(mockCategory.id, updateDto);

      expect(service.update).toHaveBeenCalledWith(mockCategory.id, updateDto);
      expect(result).toEqual(updatedCategory);
    });
  });

  describe('remove', () => {
    it('should call categoryService.remove', async () => {
      mockCategoryService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockCategory.id);

      expect(service.remove).toHaveBeenCalledWith(mockCategory.id);
      expect(result).toBeUndefined();
    });
  });
});

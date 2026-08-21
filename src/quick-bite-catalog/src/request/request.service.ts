import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CatalogRequest,
  RestaurantRegistrationPayload,
} from './entities/catalog-request.entity';
import { Restaurant } from '../restaurant/entities/restaurant.entity';
import {
  CreateRequestDto,
  FoodReportPayloadDto,
  RestaurantRegistrationPayloadDto,
  SystemFeedbackPayloadDto,
} from './dto/create-request.dto';
import { ProcessRequestDto } from './dto/process-request.dto';
import { QueryRequestDto } from './dto/query-request.dto';
import { RequestAction, RequestStatus, RequestType } from './enums/request.enum';

@Injectable()
export class RequestService {
  constructor(
    @InjectRepository(CatalogRequest)
    private readonly requestRepository: Repository<CatalogRequest>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Validate type-specific payload against designated DTO schemas.
   */
  private async validatePayload(
    type: RequestType,
    rawPayload: unknown,
  ): Promise<void> {
    if (!rawPayload || typeof rawPayload !== 'object') {
      throw new BadRequestException('Request payload must be a valid non-empty object.');
    }

    let validationInstance: object;

    switch (type) {
      case RequestType.RESTAURANT_REGISTRATION:
        validationInstance = plainToInstance(
          RestaurantRegistrationPayloadDto,
          rawPayload,
        );
        break;
      case RequestType.FOOD_REPORT:
        validationInstance = plainToInstance(FoodReportPayloadDto, rawPayload);
        break;
      case RequestType.SYSTEM_FEEDBACK:
        validationInstance = plainToInstance(
          SystemFeedbackPayloadDto,
          rawPayload,
        );
        break;
      default:
        return;
    }

    const errors = await validate(validationInstance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const errorMessages = errors.flatMap((err) =>
        err.constraints ? Object.values(err.constraints) : [JSON.stringify(err)],
      );
      throw new BadRequestException({
        message: 'Payload validation failed.',
        errors: errorMessages,
      });
    }
  }

  /**
   * Create a new catalog request.
   */
  async create(
    userId: string,
    createRequestDto: CreateRequestDto,
  ): Promise<CatalogRequest> {
    if (!userId) {
      throw new BadRequestException('Authenticated user ID is required to submit a request.');
    }

    // Strictly validate dynamic payload according to request type
    await this.validatePayload(createRequestDto.type, createRequestDto.payload);

    // If request is restaurant registration, verify single restaurant constraint, pending request constraint, and slug uniqueness
    if (createRequestDto.type === RequestType.RESTAURANT_REGISTRATION) {
      // 1. Check if user already owns a restaurant
      const existingOwnerRestaurant = await this.restaurantRepository.findOne({
        where: { ownerId: userId },
      });
      if (existingOwnerRestaurant) {
        throw new ConflictException(
          'Tài khoản của bạn đã sở hữu một nhà hàng trên hệ thống QuickBite.',
        );
      }

      // 2. Check if user already has a pending registration request
      const existingPendingRequest = await this.requestRepository.findOne({
        where: {
          userId,
          type: RequestType.RESTAURANT_REGISTRATION,
          status: RequestStatus.PENDING,
        },
      });
      if (existingPendingRequest) {
        throw new ConflictException(
          'Bạn đã có một hồ sơ đăng ký nhà hàng đang chờ xét duyệt.',
        );
      }

      const payload = createRequestDto.payload as RestaurantRegistrationPayload;
      const existingRestaurant = await this.restaurantRepository.findOne({
        where: { slug: payload.slug },
      });

      if (existingRestaurant) {
        throw new ConflictException(
          `Restaurant with slug '${payload.slug}' already exists.`,
        );
      }

      // Ensure ownerId default is set to requesting user if omitted
      if (!payload.ownerId) {
        payload.ownerId = userId;
      }
    }

    const catalogRequest = this.requestRepository.create({
      userId,
      type: createRequestDto.type,
      status: RequestStatus.PENDING,
      payload: createRequestDto.payload,
    });

    return await this.requestRepository.save(catalogRequest);
  }

  /**
   * Get current user's latest restaurant registration request.
   */
  async getMyLatestRegistration(userId: string): Promise<CatalogRequest | null> {
    return await this.requestRepository.findOne({
      where: {
        userId,
        type: RequestType.RESTAURANT_REGISTRATION,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find paginated list of catalog requests with optional filters.
   */
  async findAll(query: QueryRequestDto) {
    const { page = 1, limit = 10, search, status, type, userId } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.requestRepository.createQueryBuilder('request');

    if (status) {
      queryBuilder.andWhere('request.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('request.type = :type', { type });
    }

    if (userId) {
      queryBuilder.andWhere('request.userId = :userId', { userId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(request.adminNote ILIKE :search OR CAST(request.payload AS text) ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('request.createdAt', 'DESC');
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find single catalog request by UUID.
   */
  async findOne(id: string): Promise<CatalogRequest> {
    const request = await this.requestRepository.findOne({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Catalog request with ID '${id}' not found.`);
    }

    return request;
  }

  /**
   * Process a catalog request within an ACID database transaction.
   * If action === APPROVE and type === RESTAURANT_REGISTRATION, creates a new Restaurant.
   * If any step fails, the entire transaction rolls back.
   */
  async process(
    id: string,
    processDto: ProcessRequestDto,
    adminId: string,
  ): Promise<CatalogRequest> {
    const request = await this.findOne(id);

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(
        `Request '${id}' has already been processed with status '${request.status}'.`,
      );
    }

    // Require adminNote when rejecting request
    if (
      processDto.action === RequestAction.REJECT &&
      (!processDto.adminNote || !processDto.adminNote.trim())
    ) {
      throw new BadRequestException(
        'Lý do từ chối (adminNote) là bắt buộc khi từ chối yêu cầu.',
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      if (processDto.action === RequestAction.APPROVE) {
        if (request.type === RequestType.RESTAURANT_REGISTRATION) {
          const payload = request.payload as RestaurantRegistrationPayload;

          // Double check slug conflict inside transaction lock
          const existingRestaurant = await manager.findOne(Restaurant, {
            where: { slug: payload.slug },
          });

          if (existingRestaurant) {
            throw new ConflictException(
              `Cannot approve registration: Restaurant with slug '${payload.slug}' already exists.`,
            );
          }

          // Create new Restaurant with ACTIVE status
          const newRestaurant = manager.create(Restaurant, {
            ownerId: payload.ownerId || request.userId,
            name: payload.name,
            slug: payload.slug,
            address: {
              line1: payload.address.line1,
              ward: payload.address.ward,
              district: payload.address.district,
              city: payload.address.city,
              geo: {
                type: 'Point',
                coordinates: payload.address.geo?.coordinates || [106.702444, 10.776192],
              },
            },
            status: 'ACTIVE',
            rating: {
              avg: 0,
              count: 0,
            },
          });

          await manager.save(Restaurant, newRestaurant);
        }

        request.status = RequestStatus.APPROVED;
      } else if (processDto.action === RequestAction.REJECT) {
        request.status = RequestStatus.REJECTED;
      } else if (processDto.action === RequestAction.RESOLVE) {
        request.status = RequestStatus.RESOLVED;
      }

      request.adminNote = processDto.adminNote ? processDto.adminNote.trim() : null;
      request.processedBy = adminId;

      return await manager.save(CatalogRequest, request);
    });
  }
}

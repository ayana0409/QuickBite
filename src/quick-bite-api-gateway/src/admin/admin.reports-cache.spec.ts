import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { AdminService } from './admin.service';
import { DynamicConfigService } from '../config/dynamic-config.service';
import { RedisCacheService } from '../cache/redis-cache.service';

describe('AdminService - Reports Calculation', () => {
  let service: AdminService;

  const mockRedisCacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockDynamicConfigService = {
    getNumberAsync: jest.fn(),
    getAsync: jest.fn(),
    get: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: RedisCacheService,
          useValue: mockRedisCacheService,
        },
        {
          provide: DynamicConfigService,
          useValue: mockDynamicConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and calculate report charts data from Order service', async () => {
    mockDynamicConfigService.getAsync.mockResolvedValue('https://order.service/api/app');

    mockHttpService.get.mockReturnValue(
      of({
        status: 200,
        data: {
          data: {
            revenue30Days: [
              { date: '01/08', revenue: 500000, ordersCount: 5, ordersCompleted: 4, ordersCancelled: 1 },
            ],
          },
        },
      }),
    );

    const result = await service.getReportsCharts(
      { startDate: '2026-08-01', endDate: '2026-08-25' },
      'Bearer test-token',
    );

    expect(result.success).toBe(true);
    expect(result.data.charts.length).toBeGreaterThan(0);
    expect(result.data.summary.totalRevenue).toBe(500000);
    expect(result.data.summary.totalOrders).toBe(5);
  });

  it('should fetch and paginate report details from Order service', async () => {
    mockDynamicConfigService.getAsync.mockResolvedValue('https://order.service/api/app');

    mockHttpService.get.mockReturnValue(
      of({
        status: 200,
        data: {
          data: {
            items: [{ id: 'order-1', orderNumber: 'ORD-001', grandTotal: 250000 }],
            totalCount: 1,
          },
        },
      }),
    );

    const result = await service.getReportsDetails(
      { page: 1, limit: 20 },
      'Bearer test-token',
    );

    expect(result.success).toBe(true);
    expect(result.data.length).toBe(1);
    expect(result.totalCount).toBe(1);
    expect(result.page).toBe(1);
  });
});

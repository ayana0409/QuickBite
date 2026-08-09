import { Test, TestingModule } from '@nestjs/testing';
import { ConfigManagementController } from './config.controller';
import { DynamicConfigService } from './dynamic-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';

describe('ConfigManagementController', () => {
  let controller: ConfigManagementController;
  let service: DynamicConfigService;

  const mockDynamicConfigService = {
    getAsync: jest.fn(),
    setConfig: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigManagementController],
      providers: [
        {
          provide: DynamicConfigService,
          useValue: mockDynamicConfigService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ConfigManagementController>(
      ConfigManagementController,
    );
    service = module.get<DynamicConfigService>(DynamicConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getConfig', () => {
    it('should return config key and value', async () => {
      mockDynamicConfigService.getAsync.mockResolvedValue('test-val');

      const result = await controller.getConfig('RATE_LIMIT_MAX');

      expect(result).toEqual({ key: 'RATE_LIMIT_MAX', value: 'test-val' });
      expect(service.getAsync).toHaveBeenCalledWith('RATE_LIMIT_MAX');
    });
  });

  describe('setConfig', () => {
    it('should update config and return success status', async () => {
      mockDynamicConfigService.setConfig.mockResolvedValue(undefined);

      const result = await controller.setConfig('RATE_LIMIT_MAX', '200');

      expect(result).toEqual({
        success: true,
        key: 'RATE_LIMIT_MAX',
        value: '200',
      });
      expect(service.setConfig).toHaveBeenCalledWith('RATE_LIMIT_MAX', '200');
    });
  });
});

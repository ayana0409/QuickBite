import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamicConfigService } from './dynamic-config.service';

describe('DynamicConfigService - Validation', () => {
  let service: DynamicConfigService;
  let mockConfigService: any;
  let mockConfigModel: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn(),
    };
    mockConfigModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      }),
      create: jest.fn(),
      db: { readyState: 1 },
    };

    service = new DynamicConfigService(mockConfigService as ConfigService, mockConfigModel);
  });

  describe('GET_CACHE_TTL validation', () => {
    it('should allow valid TTL values between 0 and 120', async () => {
      await expect(service.setConfig('GET_CACHE_TTL', '0')).resolves.not.toThrow();
      await expect(service.setConfig('GET_CACHE_TTL', '30')).resolves.not.toThrow();
      await expect(service.setConfig('GET_CACHE_TTL', '120')).resolves.not.toThrow();
    });

    it('should throw BadRequestException when TTL is less than 0', async () => {
      await expect(service.setConfig('GET_CACHE_TTL', '-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when TTL is greater than 120', async () => {
      await expect(service.setConfig('GET_CACHE_TTL', '121')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when TTL is not a valid number', async () => {
      await expect(service.setConfig('GET_CACHE_TTL', 'invalid_string')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

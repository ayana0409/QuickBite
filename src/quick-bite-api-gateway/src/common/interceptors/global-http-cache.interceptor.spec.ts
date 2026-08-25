import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { GlobalHttpCacheInterceptor } from './global-http-cache.interceptor';
import { DynamicConfigService } from '../../config/dynamic-config.service';
import { RedisCacheService } from '../../cache/redis-cache.service';

describe('GlobalHttpCacheInterceptor', () => {
  let interceptor: GlobalHttpCacheInterceptor;

  const mockDynamicConfigService = {
    getNumberAsync: jest.fn(),
  };

  const mockRedisCacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(() => {
    mockDynamicConfigService.getNumberAsync.mockResolvedValue(30); // 30s TTL default
    mockRedisCacheService.get.mockResolvedValue(null);
    mockRedisCacheService.set.mockResolvedValue(undefined);

    interceptor = new GlobalHttpCacheInterceptor(
      mockDynamicConfigService as unknown as DynamicConfigService,
      mockRedisCacheService as unknown as RedisCacheService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (
    method = 'GET',
    url = '/api/merchant/orders?page=1',
    auth = 'Bearer test-token',
    query: any = {},
  ): ExecutionContext => {
    const mockRequest = {
      method,
      originalUrl: url,
      url,
      query,
      headers: {
        authorization: auth,
      },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should serve response from Redis cache on cache hit without calling handler', async () => {
    const cachedPayload = { success: true, data: [{ id: 'order-123' }] };
    mockRedisCacheService.get.mockResolvedValue(cachedPayload);

    const mockHandler: CallHandler = {
      handle: jest.fn().mockReturnValue(of({ success: true, data: [] })),
    };

    const context = createMockContext('GET', '/api/merchant/orders?page=1');
    const result$ = await interceptor.intercept(context, mockHandler);
    const result = await result$.toPromise();

    expect(result).toEqual(cachedPayload);
    expect(mockHandler.handle).not.toHaveBeenCalled();
  });

  it('should execute downstream handler on cache miss and save response to Redis', async () => {
    mockRedisCacheService.get.mockResolvedValue(null);
    const freshPayload = { success: true, data: [{ id: 'order-fresh' }] };

    const mockHandler: CallHandler = {
      handle: jest.fn().mockReturnValue(of(freshPayload)),
    };

    const context = createMockContext('GET', '/api/merchant/orders?page=1');
    const result$ = await interceptor.intercept(context, mockHandler);
    const result = await result$.toPromise();

    expect(result).toEqual(freshPayload);
    expect(mockHandler.handle).toHaveBeenCalled();
    expect(mockRedisCacheService.set).toHaveBeenCalledWith(
      expect.stringContaining('gateway:http:cache:GET:/api/merchant/orders?page=1'),
      freshPayload,
      30,
    );
  });

  it('should bypass cache lookup when ?refresh=true is provided', async () => {
    mockRedisCacheService.get.mockResolvedValue({ cached: true });
    const freshPayload = { refreshed: true };

    const mockHandler: CallHandler = {
      handle: jest.fn().mockReturnValue(of(freshPayload)),
    };

    const context = createMockContext(
      'GET',
      '/api/admin/reports/charts?refresh=true',
      'Bearer token',
      { refresh: 'true' },
    );
    const result$ = await interceptor.intercept(context, mockHandler);
    const result = await result$.toPromise();

    expect(mockRedisCacheService.get).not.toHaveBeenCalled();
    expect(result).toEqual(freshPayload);
  });

  it('should not cache non-GET requests', async () => {
    const postPayload = { created: true };
    const mockHandler: CallHandler = {
      handle: jest.fn().mockReturnValue(of(postPayload)),
    };

    const context = createMockContext('POST', '/api/merchant/orders');
    const result$ = await interceptor.intercept(context, mockHandler);
    const result = await result$.toPromise();

    expect(mockRedisCacheService.get).not.toHaveBeenCalled();
    expect(mockRedisCacheService.set).not.toHaveBeenCalled();
    expect(result).toEqual(postPayload);
  });

  it('should bypass cache when GET_CACHE_TTL is 0', async () => {
    mockDynamicConfigService.getNumberAsync.mockResolvedValue(0); // Cache disabled
    const mockHandler: CallHandler = {
      handle: jest.fn().mockReturnValue(of({ disabled: true })),
    };

    const context = createMockContext('GET', '/api/merchant/orders');
    const result$ = await interceptor.intercept(context, mockHandler);
    await result$.toPromise();

    expect(mockRedisCacheService.get).not.toHaveBeenCalled();
    expect(mockRedisCacheService.set).not.toHaveBeenCalled();
  });

  it('should bypass excluded prefixes like /health and /config', async () => {
    const mockHandler: CallHandler = {
      handle: jest.fn().mockReturnValue(of({ status: 'ok' })),
    };

    const context = createMockContext('GET', '/health');
    const result$ = await interceptor.intercept(context, mockHandler);
    await result$.toPromise();

    expect(mockRedisCacheService.get).not.toHaveBeenCalled();
  });
});

import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, delay } from 'rxjs';
import { RequestCoalescingInterceptor } from './request-coalescing.interceptor';

describe('RequestCoalescingInterceptor', () => {
  let interceptor: RequestCoalescingInterceptor;

  beforeEach(() => {
    interceptor = new RequestCoalescingInterceptor();
  });

  const createMockContext = (method = 'GET', url = '/api/admin/reports/charts', auth = 'Bearer test-token'): ExecutionContext => {
    const mockRequest = {
      method,
      originalUrl: url,
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

  it('should execute downstream handler only once when multiple identical GET requests are received concurrently', async () => {
    let executionCount = 0;

    const mockHandler: CallHandler = {
      handle: () => {
        executionCount += 1;
        // Simulate an async upstream service response taking 50ms
        return of({ data: 'report-data', execId: executionCount }).pipe(delay(50));
      },
    };

    const context1 = createMockContext('GET', '/api/admin/reports/charts', 'Bearer token-1');
    const context2 = createMockContext('GET', '/api/admin/reports/charts', 'Bearer token-1');

    // Fire 2 concurrent requests
    const [result1, result2] = await Promise.all([
      interceptor.intercept(context1, mockHandler).toPromise(),
      interceptor.intercept(context2, mockHandler).toPromise(),
    ]);

    // Downstream service handler should only have been called once!
    expect(executionCount).toBe(1);
    expect(result1).toEqual({ data: 'report-data', execId: 1 });
    expect(result2).toEqual({ data: 'report-data', execId: 1 });
  });

  it('should not coalesce non-GET requests', async () => {
    let postExecutionCount = 0;

    const mockHandler: CallHandler = {
      handle: () => {
        postExecutionCount += 1;
        return of({ success: true, count: postExecutionCount });
      },
    };

    const context1 = createMockContext('POST', '/api/admin/stats/reset-cache');
    const context2 = createMockContext('POST', '/api/admin/stats/reset-cache');

    const result1 = await interceptor.intercept(context1, mockHandler).toPromise();
    const result2 = await interceptor.intercept(context2, mockHandler).toPromise();

    expect(postExecutionCount).toBe(2);
    expect(result1.count).toBe(1);
    expect(result2.count).toBe(2);
  });

  it('should differentiate requests with different authorization tokens or URLs', async () => {
    let executionCount = 0;

    const mockHandler: CallHandler = {
      handle: () => {
        executionCount += 1;
        return of({ execId: executionCount }).pipe(delay(30));
      },
    };

    const contextUserA = createMockContext('GET', '/api/admin/reports/charts', 'Bearer user-a');
    const contextUserB = createMockContext('GET', '/api/admin/reports/charts', 'Bearer user-b');

    const [resultA, resultB] = await Promise.all([
      interceptor.intercept(contextUserA, mockHandler).toPromise(),
      interceptor.intercept(contextUserB, mockHandler).toPromise(),
    ]);

    // Distinct tokens must not coalesce
    expect(executionCount).toBe(2);
    expect(resultA.execId).toBe(1);
    expect(resultB.execId).toBe(2);
  });
});

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionGuard(reflector);
    delete process.env.BYPASS_AUTH;
  });

  const createMockContext = (userPermissions?: string[], user?: any): ExecutionContext => {
    const mockRequest = {
      user: user !== undefined ? user : { permissions: userPermissions },
    };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as any;
  };

  it('should allow access if BYPASS_AUTH is true', () => {
    process.env.BYPASS_AUTH = 'true';
    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if endpoint requires no permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext(['Gateway.Config.View']);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user is missing', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Gateway.Config.View']);
    const context = createMockContext(undefined, null);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user does not have required permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Gateway.Config.Update']);
    const context = createMockContext(['Gateway.Config.View']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow access if user has all required permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Gateway.Config.View']);
    const context = createMockContext(['Gateway.Config.View', 'Gateway.Config.Update']);
    expect(guard.canActivate(context)).toBe(true);
  });
});

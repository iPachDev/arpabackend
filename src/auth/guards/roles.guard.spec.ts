import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/schemas/user.schema';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  function contextFor(role: UserRole): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role } }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => jest.clearAllMocks());

  it('permite un rol incluido por el decorador', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      UserRole.OWNER,
    ]);

    expect(guard.canActivate(contextFor(UserRole.OWNER))).toBe(true);
  });

  it('rechaza un rol no permitido', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      UserRole.OWNER,
    ]);

    expect(() => guard.canActivate(contextFor(UserRole.READER))).toThrow(
      ForbiddenException,
    );
  });
});

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums/user-role.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  const createContext = (user?: { role: UserRole }) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as ExecutionContext;

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows access when the user has a required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(
      guard.canActivate(createContext({ role: UserRole.ADMIN })),
    ).toBe(true);
  });

  it('denies access when the user lacks the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(() =>
      guard.canActivate(createContext({ role: UserRole.DELIVERY_AGENT })),
    ).toThrow(ForbiddenException);
  });
});

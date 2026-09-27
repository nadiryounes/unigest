import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../entities/user.entity';

function contextWith(user: any): ExecutionContext {
  return {
    getHandler: () => (() => undefined),
    getClass: () => class TestController {},
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as any;
}

describe('RolesGuard', () => {
  it('allows requests when no roles are required', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    expect(new RolesGuard(reflector).canActivate(contextWith(undefined))).toBe(true);
  });

  it('allows an authorized role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;

    expect(
      new RolesGuard(reflector).canActivate(contextWith({ role: UserRole.ADMIN })),
    ).toBe(true);
  });

  it('denies an unauthorized role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;

    expect(
      new RolesGuard(reflector).canActivate(contextWith({ role: UserRole.STUDENT })),
    ).toBe(false);
  });
});

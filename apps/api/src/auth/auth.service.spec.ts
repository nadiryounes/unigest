import * as bcrypt from 'bcryptjs';
import {
  BadRequestException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRole } from '../entities/user.entity';

describe('AuthService', () => {
  const jwt = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
  };

  function resetRepo(overrides: any = {}) {
    return {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'r1', ...value })),
      findOne: jest.fn(),
      ...overrides,
    };
  }

  beforeEach(() => jest.clearAllMocks());

  it('returns a versioned JWT and safe user for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('CorrectPassword123!', 4);
    const user = {
      id: 'u1',
      email: 'admin@example.org',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Test',
      role: UserRole.ADMIN,
      active: true,
      tokenVersion: 3,
      failedLoginAttempts: 0,
      lockedUntil: null,
    };
    const users = {
      findByEmail: jest.fn().mockResolvedValue(user),
      ensureBootstrapAdmin: jest.fn(),
      isTemporarilyLocked: jest.fn().mockReturnValue(false),
      registerFailedLogin: jest.fn(),
      clearLoginFailures: jest.fn().mockResolvedValue(user),
    };

    const service = new AuthService(users as any, jwt as any, resetRepo() as any);
    const result = await service.login(
      ' ADMIN@EXAMPLE.ORG ',
      'CorrectPassword123!',
    );

    expect(users.findByEmail).toHaveBeenCalledWith('admin@example.org');
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'u1', ver: 3 }),
    );
    expect(result.accessToken).toBe('signed-token');
    expect((result.user as any).passwordHash).toBeUndefined();
  });

  it('records a failed login without revealing whether the account exists', async () => {
    const passwordHash = await bcrypt.hash('CorrectPassword123!', 4);
    const user = {
      id: 'u1',
      email: 'admin@example.org',
      passwordHash,
      active: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    };
    const users = {
      findByEmail: jest.fn().mockResolvedValue(user),
      ensureBootstrapAdmin: jest.fn(),
      isTemporarilyLocked: jest.fn().mockReturnValue(false),
      registerFailedLogin: jest.fn().mockResolvedValue(user),
    };

    const service = new AuthService(users as any, jwt as any, resetRepo() as any);

    await expect(
      service.login('admin@example.org', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(users.registerFailedLogin).toHaveBeenCalledWith(user);
  });

  it('rejects a temporarily locked account before password comparison', async () => {
    const users = {
      findByEmail: jest.fn().mockResolvedValue({
        id: 'locked',
        active: true,
        passwordHash: 'unused',
        lockedUntil: new Date(Date.now() + 60_000),
      }),
      isTemporarilyLocked: jest.fn().mockReturnValue(true),
    };
    const service = new AuthService(users as any, jwt as any, resetRepo() as any);

    await expect(
      service.login('locked@example.org', 'anything'),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('accepts a matching bootstrap administrator returned by UsersService', async () => {
    const passwordHash = await bcrypt.hash('BootstrapPassword123!', 4);
    const bootstrapUser = {
      id: 'bootstrap',
      email: 'bootstrap@example.org',
      passwordHash,
      firstName: 'Bootstrap',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      active: true,
      tokenVersion: 0,
      failedLoginAttempts: 0,
      lockedUntil: null,
    };
    const users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      ensureBootstrapAdmin: jest.fn().mockResolvedValue(bootstrapUser),
      clearLoginFailures: jest.fn().mockResolvedValue(bootstrapUser),
    };

    const service = new AuthService(users as any, jwt as any, resetRepo() as any);
    const result = await service.login(
      'bootstrap@example.org',
      'BootstrapPassword123!',
    );

    expect(users.ensureBootstrapAdmin).toHaveBeenCalled();
    expect(result.user.role).toBe(UserRole.ADMIN);
  });

  it('changes a password and revokes existing sessions', async () => {
    const passwordHash = await bcrypt.hash('CurrentPassword123!', 4);
    const user = { id: 'u1', passwordHash };
    const users = {
      setPassword: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AuthService(users as any, jwt as any, resetRepo() as any);

    const result = await service.changePassword(
      user as any,
      'CurrentPassword123!',
      'NewPassword123!',
    );

    expect(users.setPassword).toHaveBeenCalledWith(user, 'NewPassword123!');
    expect(result.message).toMatch(/sessions/);
  });

  it('rejects reuse of the current password', async () => {
    const passwordHash = await bcrypt.hash('SamePassword123!', 4);
    const service = new AuthService(
      { setPassword: jest.fn() } as any,
      jwt as any,
      resetRepo() as any,
    );

    await expect(
      service.changePassword(
        { id: 'u1', passwordHash } as any,
        'SamePassword123!',
        'SamePassword123!',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates an opaque one-time reset token without exposing account existence', async () => {
    const reset = resetRepo();
    const users = {
      findByEmail: jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'user@example.org',
        active: true,
      }),
    };
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const service = new AuthService(users as any, jwt as any, reset as any);
    const result = await service.forgotPassword('user@example.org');

    expect(result.message).toMatch(/Si un compte actif/);
    expect((result as any).resetToken).toBeUndefined();
    expect(reset.save).toHaveBeenCalledTimes(1);

    process.env.NODE_ENV = previousEnv;
  });

  it('consumes a valid reset token and revokes all existing sessions', async () => {
    const crypto = require('crypto');
    const rawToken = 'valid-reset-token';
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const reset = resetRepo({
      findOne: jest.fn().mockResolvedValue({
        id: 'r1',
        userId: 'u1',
        tokenHash,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      }),
    });
    const user = { id: 'u1', active: true };
    const users = {
      findById: jest.fn().mockResolvedValue(user),
      setPassword: jest.fn().mockResolvedValue(user),
    };
    const service = new AuthService(users as any, jwt as any, reset as any);

    await service.resetPassword(rawToken, 'ResetPassword123!');

    expect(users.setPassword).toHaveBeenCalledWith(user, 'ResetPassword123!');
    expect(reset.update).toHaveBeenCalled();
  });
});

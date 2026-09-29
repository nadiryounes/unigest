import * as bcrypt from 'bcryptjs';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRole } from '../entities/user.entity';

describe('AuthService', () => {
  const jwt = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
    verifyAsync: jest.fn(),
  };

  const mail = {
    sendPasswordReset: jest.fn().mockResolvedValue(true),
  };

  function security(overrides: any = {}) {
    return {
      mfaEnabled: jest.fn().mockResolvedValue(false),
      verifyMfa: jest.fn().mockResolvedValue(true),
      createPasswordReset: jest.fn(),
      confirmPasswordReset: jest.fn(),
      status: jest.fn(),
      setupMfa: jest.fn(),
      enableMfa: jest.fn(),
      disableMfa: jest.fn(),
      ...overrides,
    };
  }

  beforeEach(() => jest.clearAllMocks());

  it('returns a JWT and safe user for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('CorrectPassword123!', 4);
    const users = {
      findByEmail: jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'admin@example.org',
        passwordHash,
        firstName: 'Admin',
        lastName: 'Test',
        role: UserRole.ADMIN,
        active: true,
        authVersion: 0,
      }),
      ensureBootstrapAdmin: jest.fn(),
    };

    const service = new AuthService(users as any, jwt as any, security() as any, mail as any);
    const result: any = await service.login(' ADMIN@EXAMPLE.ORG ', 'CorrectPassword123!');

    expect(users.findByEmail).toHaveBeenCalledWith('admin@example.org');
    expect(result.accessToken).toBe('signed-token');
    expect(result.user).toEqual(expect.objectContaining({
      id: 'u1',
      email: 'admin@example.org',
      role: UserRole.ADMIN,
    }));
    expect(result.user.passwordHash).toBeUndefined();
  });

  it('returns an MFA challenge instead of an access token when MFA is enabled', async () => {
    const passwordHash = await bcrypt.hash('CorrectPassword123!', 4);
    const users = {
      findByEmail: jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'admin@example.org',
        passwordHash,
        firstName: 'Admin',
        lastName: 'Test',
        role: UserRole.ADMIN,
        active: true,
        authVersion: 2,
      }),
      ensureBootstrapAdmin: jest.fn(),
    };
    const service = new AuthService(
      users as any,
      jwt as any,
      security({ mfaEnabled: jest.fn().mockResolvedValue(true) }) as any,
      mail as any,
    );

    const result: any = await service.login('admin@example.org', 'CorrectPassword123!');

    expect(result.mfaRequired).toBe(true);
    expect(result.mfaToken).toBe('signed-token');
    expect(result.accessToken).toBeUndefined();
  });

  it('rejects invalid credentials when bootstrap does not match', async () => {
    const users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      ensureBootstrapAdmin: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AuthService(users as any, jwt as any, security() as any, mail as any);

    await expect(service.login('nobody@example.org', 'wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
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
      authVersion: 0,
    };
    const users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      ensureBootstrapAdmin: jest.fn().mockResolvedValue(bootstrapUser),
    };

    const service = new AuthService(users as any, jwt as any, security() as any, mail as any);
    const result: any = await service.login('bootstrap@example.org', 'BootstrapPassword123!');

    expect(users.ensureBootstrapAdmin).toHaveBeenCalled();
    expect(result.user.role).toBe(UserRole.ADMIN);
  });
});

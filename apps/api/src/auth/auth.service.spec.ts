import * as bcrypt from 'bcryptjs';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRole } from '../entities/user.entity';

describe('AuthService', () => {
  const jwt = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
  };

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
      }),
      ensureBootstrapAdmin: jest.fn(),
    };

    const service = new AuthService(users as any, jwt as any);
    const result = await service.login(' ADMIN@EXAMPLE.ORG ', 'CorrectPassword123!');

    expect(users.findByEmail).toHaveBeenCalledWith('admin@example.org');
    expect(result.accessToken).toBe('signed-token');
    expect(result.user).toEqual(expect.objectContaining({
      id: 'u1',
      email: 'admin@example.org',
      role: UserRole.ADMIN,
    }));
    expect((result.user as any).passwordHash).toBeUndefined();
  });

  it('rejects invalid credentials when bootstrap does not match', async () => {
    const users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      ensureBootstrapAdmin: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AuthService(users as any, jwt as any);

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
    };
    const users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      ensureBootstrapAdmin: jest.fn().mockResolvedValue(bootstrapUser),
    };

    const service = new AuthService(users as any, jwt as any);
    const result = await service.login('bootstrap@example.org', 'BootstrapPassword123!');

    expect(users.ensureBootstrapAdmin).toHaveBeenCalled();
    expect(result.user.role).toBe(UserRole.ADMIN);
  });
});

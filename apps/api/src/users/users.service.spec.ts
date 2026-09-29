import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { UserRole } from '../entities/user.entity';

describe('UsersService bootstrap administrator', () => {
  const previous = { ...process.env };

  beforeEach(() => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = 'bootstrap@example.org';
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'BootstrapPassword123!';
    process.env.BOOTSTRAP_ADMIN_FIRST_NAME = 'Bootstrap';
    process.env.BOOTSTRAP_ADMIN_LAST_NAME = 'Admin';
  });

  afterAll(() => {
    process.env = previous;
  });

  it('creates the bootstrap administrator only when the account does not exist', async () => {
    const repo: any = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'u1', ...value })),
    };
    const service = new UsersService(repo, {} as any, {} as any);

    const user = await service.ensureBootstrapAdmin(
      'bootstrap@example.org',
      'BootstrapPassword123!',
    );

    expect(user?.role).toBe(UserRole.ADMIN);
    expect(await bcrypt.compare('BootstrapPassword123!', user!.passwordHash)).toBe(true);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('changes a password and increments the authentication version', async () => {
    const user: any = {
      id: 'u1',
      email: 'user@example.org',
      passwordHash: await bcrypt.hash('OldPassword123!', 4),
      active: true,
      authVersion: 2,
    };
    const repo: any = {
      findOne: jest.fn().mockResolvedValue(user),
      save: jest.fn(async (value) => value),
    };
    const service = new UsersService(repo, {} as any, {} as any);

    await service.setPassword('u1', 'NewPassword456!');

    expect(user.authVersion).toBe(3);
    expect(user.passwordChangedAt).toBeInstanceOf(Date);
    expect(await bcrypt.compare('NewPassword456!', user.passwordHash)).toBe(true);
  });

  it('does not reset or reactivate an existing account with the bootstrap secret', async () => {
    const existing = {
      id: 'existing',
      email: 'bootstrap@example.org',
      passwordHash: await bcrypt.hash('DifferentPassword123!', 4),
      firstName: 'Existing',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      active: false,
    };
    const repo: any = {
      findOne: jest.fn().mockResolvedValue(existing),
      create: jest.fn(),
      save: jest.fn(),
    };
    const service = new UsersService(repo, {} as any, {} as any);

    const result = await service.ensureBootstrapAdmin(
      'bootstrap@example.org',
      'BootstrapPassword123!',
    );

    expect(result).toBeUndefined();
    expect(repo.save).not.toHaveBeenCalled();
    expect(existing.active).toBe(false);
  });
});

import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy session versioning', () => {
  function strategy(user: any) {
    const config: any = { get: (key: string) => key === 'JWT_SECRET' ? 'a'.repeat(48) : key === 'NODE_ENV' ? 'production' : undefined };
    const users: any = { findById: jest.fn().mockResolvedValue(user) };
    return new JwtStrategy(config, users);
  }

  it('accepts a token with the current auth version', async () => {
    const user = { id: 'u1', active: true, authVersion: 2 };
    await expect(strategy(user).validate({ sub: 'u1', av: 2 })).resolves.toBe(user);
  });

  it('rejects a token invalidated by a password/session change', async () => {
    const user = { id: 'u1', active: true, authVersion: 3 };
    await expect(strategy(user).validate({ sub: 'u1', av: 2 })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

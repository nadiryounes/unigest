import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy session versioning', () => {
  function config(secret = 'a'.repeat(48)) {
    return {
      get: (key: string) => {
        if (key === 'JWT_SECRET') return secret;
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      },
    } as any;
  }

  it('accepts the current token version', async () => {
    const users = {
      findById: jest.fn().mockResolvedValue({
        id: 'u1',
        active: true,
        tokenVersion: 2,
      }),
    };
    const strategy = new JwtStrategy(config(), users as any);

    await expect(strategy.validate({ sub: 'u1', ver: 2 })).resolves.toEqual(
      expect.objectContaining({ id: 'u1' }),
    );
  });

  it('rejects a revoked token version', async () => {
    const users = {
      findById: jest.fn().mockResolvedValue({
        id: 'u1',
        active: true,
        tokenVersion: 3,
      }),
    };
    const strategy = new JwtStrategy(config(), users as any);

    await expect(
      strategy.validate({ sub: 'u1', ver: 2 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

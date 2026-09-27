import { ConfigService } from '@nestjs/config';
import { resolveJwtSecret } from './jwt-secret';

describe('resolveJwtSecret', () => {
  it('rejects a weak production secret', () => {
    const config = {
      get: (key: string) => key === 'NODE_ENV' ? 'production' : key === 'JWT_SECRET' ? 'weak' : undefined,
    } as ConfigService;

    expect(() => resolveJwtSecret(config)).toThrow(/32 caractères/);
  });

  it('accepts a sufficiently long production secret', () => {
    const strong = 'a'.repeat(48);
    const config = {
      get: (key: string) => key === 'NODE_ENV' ? 'production' : key === 'JWT_SECRET' ? strong : undefined,
    } as ConfigService;

    expect(resolveJwtSecret(config)).toBe(strong);
  });
});

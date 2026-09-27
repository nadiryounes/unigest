import { HttpException } from '@nestjs/common';
import { SensitiveRateLimitGuard } from './sensitive-rate-limit.guard';

function context(path: string, method = 'POST', ip = '203.0.113.10') {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        path,
        headers: { 'x-forwarded-for': ip },
        ip,
      }),
    }),
  } as any;
}

describe('SensitiveRateLimitGuard', () => {
  const previous = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
  });

  afterAll(() => {
    process.env = previous;
  });

  it('ignores ordinary authenticated routes', async () => {
    const dataSource = { query: jest.fn() };
    const guard = new SensitiveRateLimitGuard(dataSource as any);

    await expect(
      guard.canActivate(context('/students', 'GET')),
    ).resolves.toBe(true);
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('allows requests under the login limit', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ count: 4 }]),
    };
    const guard = new SensitiveRateLimitGuard(dataSource as any);

    await expect(
      guard.canActivate(context('/auth/login')),
    ).resolves.toBe(true);
    expect(dataSource.query).toHaveBeenCalledTimes(1);
  });

  it('returns 429 above the persistent login limit', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ count: 11 }]),
    };
    const guard = new SensitiveRateLimitGuard(dataSource as any);

    await expect(
      guard.canActivate(context('/auth/login')),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('rate limits public document uploads', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ count: 21 }]),
    };
    const guard = new SensitiveRateLimitGuard(dataSource as any);

    await expect(
      guard.canActivate(
        context('/admissions/public/applications/APP-123/documents'),
      ),
    ).rejects.toBeInstanceOf(HttpException);
  });
});

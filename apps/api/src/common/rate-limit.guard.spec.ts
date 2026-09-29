import { ExecutionContext, HttpException } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';

function context(path = '/auth/login') {
  const headers: Record<string, string> = {};
  const req = {
    method: 'POST',
    path,
    body: { email: 'admin@example.org' },
    headers: { 'x-forwarded-for': '203.0.113.20' },
  };
  const res = {
    headers,
    setHeader: jest.fn((key: string, value: string) => { headers[key] = String(value); }),
  };
  const ctx = {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;
  return { ctx, res };
}

describe('RateLimitGuard', () => {
  it('uses the shared PostgreSQL counter when available', async () => {
    const dataSource: any = {
      query: jest.fn().mockResolvedValue([{ count: 1, resetAt: new Date(Date.now() + 60_000) }]),
    };
    const guard = new RateLimitGuard(dataSource);
    const { ctx, res } = context();

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(dataSource.query).toHaveBeenCalledTimes(1);
    expect(res.headers['RateLimit-Limit']).toBe('10');
  });

  it('blocks when the shared counter exceeds the policy', async () => {
    const dataSource: any = {
      query: jest.fn().mockResolvedValue([{ count: 11, resetAt: new Date(Date.now() + 60_000) }]),
    };
    const guard = new RateLimitGuard(dataSource);
    const { ctx } = context();

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(HttpException);
  });

  it('does not rate limit ordinary authenticated routes', async () => {
    const dataSource: any = { query: jest.fn() };
    const guard = new RateLimitGuard(dataSource);
    const { ctx } = context('/students');
    (ctx.switchToHttp().getRequest() as any).method = 'GET';

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(dataSource.query).not.toHaveBeenCalled();
  });
});

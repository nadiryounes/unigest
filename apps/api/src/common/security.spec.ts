import { securityHeaders, targetedRateLimit } from './security';

function response() {
  const headers: Record<string, string> = {};
  return {
    headers,
    statusCode: 0,
    body: undefined as any,
    setHeader: jest.fn((key: string, value: string) => { headers[key] = String(value); }),
    status: jest.fn(function (this: any, code: number) { this.statusCode = code; return this; }),
    json: jest.fn(function (this: any, body: any) { this.body = body; return this; }),
  };
}

describe('HTTP security middleware', () => {
  it('sets baseline security headers', () => {
    const res = response();
    const next = jest.fn();
    securityHeaders({} as any, res as any, next);
    expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(res.headers['X-Frame-Options']).toBe('DENY');
    expect(res.headers['Content-Security-Policy']).toContain("default-src 'none'");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rate limits repeated login attempts', () => {
    const req = {
      method: 'POST',
      path: '/auth/login',
      headers: { 'x-forwarded-for': '203.0.113.55' },
    };
    for (let i = 0; i < 10; i++) {
      const res = response();
      const next = jest.fn();
      targetedRateLimit(req as any, res as any, next);
      expect(next).toHaveBeenCalledTimes(1);
    }
    const blocked = response();
    const next = jest.fn();
    targetedRateLimit(req as any, blocked as any, next);
    expect(next).not.toHaveBeenCalled();
    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers['Retry-After']).toBeDefined();
  });
});

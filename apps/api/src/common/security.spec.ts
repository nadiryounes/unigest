import { securityHeaders } from './security';

describe('HTTP security middleware', () => {
  it('sets baseline security headers', () => {
    const headers: Record<string, string> = {};
    const res: any = {
      setHeader: jest.fn((key: string, value: string) => { headers[key] = String(value); }),
    };
    const next = jest.fn();

    securityHeaders({} as any, res, next);

    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Content-Security-Policy']).toContain("default-src 'none'");
    expect(next).toHaveBeenCalledTimes(1);
  });
});

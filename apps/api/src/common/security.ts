type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientKey(req: any) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
}

function policy(req: any) {
  const method = String(req.method || '').toUpperCase();
  const path = String(req.path || req.url || '').split('?')[0];
  if (method === 'POST' && path === '/auth/login') return { limit: 10, windowMs: 15 * 60_000, scope: 'login' };
  if (method === 'POST' && path.startsWith('/admissions/public/')) return { limit: 30, windowMs: 60 * 60_000, scope: 'public-admissions' };
  return null;
}

export function securityHeaders(req: any, res: any, next: () => void) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

export function targetedRateLimit(req: any, res: any, next: () => void) {
  if (String(req.method || '').toUpperCase() === 'OPTIONS') return next();
  const p = policy(req);
  if (!p) return next();

  const now = Date.now();
  const key = `${p.scope}:${clientKey(req)}`;
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + p.windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;

  res.setHeader('RateLimit-Limit', String(p.limit));
  res.setHeader('RateLimit-Remaining', String(Math.max(0, p.limit - bucket.count)));
  res.setHeader('RateLimit-Reset', String(Math.ceil((bucket.resetAt - now) / 1000)));

  if (bucket.count > p.limit) {
    res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
    res.status(429).json({
      statusCode: 429,
      message: 'Trop de requêtes. Réessayez plus tard.',
      error: 'Too Many Requests',
    });
    return;
  }
  next();
}

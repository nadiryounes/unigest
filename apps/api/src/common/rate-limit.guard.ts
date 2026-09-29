import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createHmac } from 'node:crypto';

type Policy = { scope: string; limit: number; windowSeconds: number };
type MemoryBucket = { count: number; resetAt: number };
const fallback = new Map<string, MemoryBucket>();

function policy(method: string, path: string): Policy | null {
  if (method !== 'POST') return null;
  if (path === '/auth/login') return { scope: 'login', limit: 10, windowSeconds: 15 * 60 };
  if (path === '/auth/mfa/verify') return { scope: 'mfa', limit: 10, windowSeconds: 10 * 60 };
  if (path === '/auth/password-reset/request') {
    return { scope: 'password-reset-request', limit: 5, windowSeconds: 60 * 60 };
  }
  if (path === '/auth/password-reset/confirm') {
    return { scope: 'password-reset-confirm', limit: 10, windowSeconds: 60 * 60 };
  }
  if (path.startsWith('/admissions/public/')) {
    return { scope: 'public-admissions', limit: 30, windowSeconds: 60 * 60 };
  }
  return null;
}

function requestIdentity(req: any) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
  const subject = String(req.body?.email || req.body?.applicationNumber || '').trim().toLowerCase();
  return `${ip}|${subject}`;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext) {
    if (context.getType() !== 'http') return true;

    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const method = String(req.method || '').toUpperCase();
    const path = String(req.path || req.url || '').split('?')[0];
    const selected = policy(method, path);
    if (!selected) return true;

    const salt = String(process.env.RATE_LIMIT_SALT || process.env.JWT_SECRET || 'unigest-rate-limit');
    const keyHash = createHmac('sha256', salt).update(requestIdentity(req)).digest('hex');

    let count = 0;
    let resetAt = new Date(Date.now() + selected.windowSeconds * 1000);

    try {
      const rows = await this.dataSource.query(
        `INSERT INTO "rate_limit_buckets" ("scope","keyHash","count","resetAt","updatedAt")
         VALUES ($1,$2,1,now() + ($3::double precision * interval '1 second'),now())
         ON CONFLICT ("scope","keyHash") DO UPDATE SET
           "count" = CASE
             WHEN "rate_limit_buckets"."resetAt" <= now() THEN 1
             ELSE "rate_limit_buckets"."count" + 1
           END,
           "resetAt" = CASE
             WHEN "rate_limit_buckets"."resetAt" <= now()
               THEN now() + ($3::double precision * interval '1 second')
             ELSE "rate_limit_buckets"."resetAt"
           END,
           "updatedAt" = now()
         RETURNING "count","resetAt"`,
        [selected.scope, keyHash, selected.windowSeconds],
      );
      count = Number(rows?.[0]?.count || 1);
      resetAt = new Date(rows?.[0]?.resetAt || resetAt);
    } catch (error: any) {
      if (error?.code !== '42P01') throw error;

      const key = `${selected.scope}:${keyHash}`;
      const now = Date.now();
      let bucket = fallback.get(key);
      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + selected.windowSeconds * 1000 };
      }
      bucket.count += 1;
      fallback.set(key, bucket);
      count = bucket.count;
      resetAt = new Date(bucket.resetAt);
    }

    const remaining = Math.max(0, selected.limit - count);
    const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));

    res.setHeader('RateLimit-Limit', String(selected.limit));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(retryAfter));

    if (count > selected.limit) {
      res.setHeader('Retry-After', String(retryAfter));
      throw new HttpException(
        'Trop de requêtes. Réessayez plus tard.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';

type RateRule = {
  scope: string;
  limit: number;
  windowMs: number;
  method: string;
  match: (path: string) => boolean;
};

@Injectable()
export class SensitiveRateLimitGuard implements CanActivate {
  private readonly rules: RateRule[] = [
    {
      scope: 'auth-login',
      limit: 10,
      windowMs: 15 * 60 * 1000,
      method: 'POST',
      match: (path) => path === '/auth/login',
    },
    {
      scope: 'auth-forgot-password',
      limit: 5,
      windowMs: 60 * 60 * 1000,
      method: 'POST',
      match: (path) => path === '/auth/forgot-password',
    },
    {
      scope: 'public-application',
      limit: 20,
      windowMs: 60 * 60 * 1000,
      method: 'POST',
      match: (path) => path === '/admissions/public/apply',
    },
    {
      scope: 'public-application-status',
      limit: 60,
      windowMs: 60 * 60 * 1000,
      method: 'GET',
      match: (path) => path === '/admissions/public/status',
    },
    {
      scope: 'public-document-upload',
      limit: 20,
      windowMs: 60 * 60 * 1000,
      method: 'POST',
      match: (path) =>
        /^\/admissions\/public\/applications\/[^/]+\/documents$/.test(path),
    },
  ];

  constructor(private readonly dataSource: DataSource) {}

  private clientKey(req: any, scope: string) {
    const forwarded = String(req.headers?.['x-forwarded-for'] || '')
      .split(',')[0]
      .trim();
    const ip =
      forwarded ||
      String(req.ip || req.socket?.remoteAddress || 'unknown').trim();
    return createHash('sha256').update(`${scope}:${ip}`).digest('hex');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      process.env.NODE_ENV === 'test' &&
      String(process.env.RATE_LIMIT_ENABLED || '').toLowerCase() !== 'true'
    ) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const method = String(req.method || '').toUpperCase();
    const path = String(req.path || req.url || '').split('?')[0];
    const rule = this.rules.find(
      (candidate) =>
        candidate.method === method && candidate.match(path),
    );

    if (!rule) return true;

    const windowStart = new Date(
      Math.floor(Date.now() / rule.windowMs) * rule.windowMs,
    );
    const keyHash = this.clientKey(req, rule.scope);

    const rows = await this.dataSource.query(
      `
      INSERT INTO "request_rate_limits" ("scope", "keyHash", "windowStart", "count")
      VALUES ($1, $2, $3, 1)
      ON CONFLICT ("scope", "keyHash", "windowStart")
      DO UPDATE SET "count" = "request_rate_limits"."count" + 1
      RETURNING "count"
      `,
      [rule.scope, keyHash, windowStart],
    );

    const count = Number(rows?.[0]?.count || 0);
    if (count > rule.limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Trop de requêtes. Réessayez plus tard.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}

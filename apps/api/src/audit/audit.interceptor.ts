import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.slice(0, 50).map(sanitize);
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (/password|token|secret|email|phone|telephone|nationalId|cin|birthDate|address/i.test(key)) out[key] = '[REDACTED]';
    else out[key] = sanitize(val);
  }
  return out;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next.handle();
    const started = Date.now();
    const parts = String(req.path || '').split('/').filter(Boolean);
    const resource = parts[0] || 'system';
    const action = `${req.method} ${resource}`;
    const base = {
      actorUserId: req.user?.id,
      actorEmail: req.user?.email,
      actorRole: req.user?.role,
      method: req.method,
      path: req.originalUrl || req.url || req.path,
      action,
      resource,
      resourceId: req.params?.id,
      details: { body: sanitize(req.body), params: sanitize(req.params), query: sanitize(req.query), durationMs: 0 },
      ip: req.ip,
    };
    return next.handle().pipe(tap({
      next: (result: any) => {
        void this.audit.record({ ...base, resourceId: base.resourceId || result?.id, details: { ...(base.details as object), durationMs: Date.now() - started }, success: true }).catch(() => undefined);
      },
      error: (error: any) => {
        void this.audit.record({ ...base, details: { ...(base.details as object), durationMs: Date.now() - started }, success: false, errorMessage: String(error?.message || 'Erreur') }).catch(() => undefined);
      },
    }));
  }
}

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StorageService } from '../storage/storage.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
    private readonly mail: MailService,
  ) {}

  async check() {
    const startedAt = Date.now();
    await this.dataSource.query('SELECT 1');
    const [storage, schemaRows] = await Promise.all([
      this.storage.health(),
      this.dataSource.query(`
        SELECT
          to_regclass('public.user_security') IS NOT NULL AS "accountSecurityReady",
          to_regclass('public.rate_limit_buckets') IS NOT NULL AS "distributedRateLimitReady"
      `),
    ]);

    return {
      status: storage.ready ? 'ok' : 'degraded',
      database: 'ok',
      storage,
      security: {
        accountSecurityReady: !!schemaRows?.[0]?.accountSecurityReady,
        distributedRateLimitReady: !!schemaRows?.[0]?.distributedRateLimitReady,
      },
      mail: this.mail.status(),
      uptimeSeconds: Math.round(process.uptime()),
      latencyMs: Date.now() - startedAt,
      version: '0.5.2',
    };
  }
}

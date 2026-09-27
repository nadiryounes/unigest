import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
  ) {}

  async check() {
    const startedAt = Date.now();
    await this.dataSource.query('SELECT 1');
    const storage = await this.storage.health();
    return {
      status: storage.ready ? 'ok' : 'degraded',
      database: 'ok',
      storage,
      passwordRecovery: {
        provider: 'resend',
        ready: Boolean(
          String(process.env.RESEND_API_KEY || '').trim() &&
            String(process.env.EMAIL_FROM || '').trim() &&
            String(process.env.PASSWORD_RESET_WEB_URL || '').trim(),
        ),
      },
      uptimeSeconds: Math.round(process.uptime()),
      latencyMs: Date.now() - startedAt,
      version: '0.5.1',
    };
  }
}

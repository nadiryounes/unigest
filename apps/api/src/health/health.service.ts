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
      uptimeSeconds: Math.round(process.uptime()),
      latencyMs: Date.now() - startedAt,
      version: '0.5.1',
    };
  }
}

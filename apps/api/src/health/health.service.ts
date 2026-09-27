import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
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
      version: '0.4.1',
    };
  }

  async checkBootstrapAdmin() {
    const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
    const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '');

    if (!email || !password) {
      return {
        configured: false,
        userExists: false,
        passwordMatches: false,
      };
    }

    const rows = await this.dataSource.query(
      'SELECT "passwordHash", role, active FROM users WHERE email = $1 LIMIT 1',
      [email],
    );
    const user = rows?.[0];

    return {
      configured: true,
      userExists: !!user,
      active: user?.active === true,
      role: user?.role || null,
      passwordMatches: user ? await bcrypt.compare(password, user.passwordHash) : false,
    };
  }
}

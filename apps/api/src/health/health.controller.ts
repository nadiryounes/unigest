import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  async check() {
    try {
      const result = await this.health.check();
      if (result.status !== 'ok') throw new ServiceUnavailableException(result);
      return result;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException({
        status: 'down',
        database: 'unavailable',
        version: '0.4.1',
      });
    }
  }

  @Get('bootstrap-admin')
  async bootstrapAdmin() {
    return this.health.checkBootstrapAdmin();
  }

  @Get('bootstrap-login')
  async bootstrapLogin() {
    const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '');
    const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '');
    const result = await this.auth.login(email, password);
    return {
      ok: true,
      role: result.user?.role || null,
      userIdPresent: !!result.user?.id,
      tokenPresent: !!result.accessToken,
    };
  }
}

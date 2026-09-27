import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

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
}

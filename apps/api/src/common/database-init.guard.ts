import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseInitGuard implements CanActivate {
  private initializing?: Promise<DataSource>;

  constructor(private readonly dataSource: DataSource) {}

  async canActivate(_context: ExecutionContext): Promise<boolean> {
    if (this.dataSource.isInitialized) return true;

    try {
      if (!this.initializing) {
        this.initializing = this.dataSource.initialize().finally(() => {
          this.initializing = undefined;
        });
      }
      await this.initializing;
      return true;
    } catch (error: any) {
      throw new ServiceUnavailableException({
        status: 'down',
        database: 'unavailable',
        error: {
          code: error?.code || undefined,
          name: error?.name || 'Error',
          message: String(error?.message || 'Database initialization failed').slice(0, 300),
        },
      });
    }
  }
}

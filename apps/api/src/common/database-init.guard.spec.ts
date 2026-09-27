import { ServiceUnavailableException } from '@nestjs/common';
import { DatabaseInitGuard } from './database-init.guard';

describe('DatabaseInitGuard', () => {
  it('does not initialize an already initialized datasource', async () => {
    const dataSource = { isInitialized: true, initialize: jest.fn() };
    const guard = new DatabaseInitGuard(dataSource as any);

    await expect(guard.canActivate({} as any)).resolves.toBe(true);
    expect(dataSource.initialize).not.toHaveBeenCalled();
  });

  it('initializes the datasource lazily', async () => {
    const dataSource: any = {
      isInitialized: false,
      initialize: jest.fn(),
    };
    dataSource.initialize.mockImplementation(async () => {
      dataSource.isInitialized = true;
      return dataSource;
    });

    const guard = new DatabaseInitGuard(dataSource);
    await expect(guard.canActivate({} as any)).resolves.toBe(true);
    expect(dataSource.initialize).toHaveBeenCalledTimes(1);
  });

  it('returns a controlled 503 when database initialization fails', async () => {
    const dataSource = {
      isInitialized: false,
      initialize: jest.fn().mockRejectedValue(Object.assign(new Error('connection failed'), { code: 'ECONNREFUSED' })),
    };
    const guard = new DatabaseInitGuard(dataSource as any);

    await expect(guard.canActivate({} as any)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});

import { BadRequestException } from '@nestjs/common';
import { StudentsService } from './students.service';

describe('StudentsService', () => {
  function service(overrides: any = {}) {
    const repo: any = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 's1', ...value })),
      ...overrides.repo,
    };
    const programs: any = {
      findOne: jest.fn().mockResolvedValue({ id: 'p1', code: 'DGI', active: true }),
      find: jest.fn().mockResolvedValue([{ id: 'p1', code: 'DGI', active: true }]),
      ...overrides.programs,
    };
    return { svc: new StudentsService(repo, programs), repo };
  }

  it('normalizes email when creating a student', async () => {
    const { svc } = service();
    const result = await svc.create({
      studentNumber: 'ETU-X',
      firstName: ' Test ',
      lastName: ' Student ',
      email: ' TEST@EXAMPLE.ORG ',
      programId: 'p1',
    });
    expect(result.email).toBe('test@example.org');
    expect(result.firstName).toBe('Test');
  });

  it('rejects malformed emails', async () => {
    const { svc } = service();
    await expect(
      svc.create({
        studentNumber: 'ETU-X',
        firstName: 'Test',
        lastName: 'Student',
        email: 'not-an-email',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reports duplicate emails during bulk import', async () => {
    const existing = { id: 'other', studentNumber: 'ETU-OLD', email: 'used@example.org' };
    const repo: any = {
      findOne: jest.fn(async ({ where }: any) => {
        if (where?.studentNumber === 'ETU-NEW') return null;
        if (where?.email === 'used@example.org') return existing;
        return null;
      }),
      create: jest.fn((value) => value),
      save: jest.fn(),
    };
    const { svc } = service({ repo });
    const result = await svc.importRows([
      {
        studentNumber: 'ETU-NEW',
        firstName: 'New',
        lastName: 'Student',
        email: 'used@example.org',
        programCode: 'DGI',
      },
    ]);
    expect(result.created).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/Email déjà utilisé/);
  });
});

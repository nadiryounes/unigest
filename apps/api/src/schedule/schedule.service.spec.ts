import { BadRequestException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
  const module = { id: 'm1', program: { id: 'p1' }, teacher: { id: 't1' } };
  const group = { id: 'g1', name: 'G1', program: { id: 'p1' } };

  function service(overrides: any = {}) {
    const repo: any = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'session-1', ...value })),
      ...overrides.repo,
    };
    const modules: any = { findOne: jest.fn().mockResolvedValue(module), ...overrides.modules };
    const teachers: any = { findOne: jest.fn().mockResolvedValue({ id: 't1' }), ...overrides.teachers };
    const groups: any = { findOne: jest.fn().mockResolvedValue(group), ...overrides.groups };
    const enrollments: any = { find: jest.fn().mockResolvedValue([]) };
    return new ScheduleService(repo, modules, teachers, groups, enrollments);
  }

  it('rejects an invalid interval', async () => {
    const svc = service();
    await expect(
      svc.create({
        moduleId: 'm1',
        groupId: 'g1',
        startsAt: '2030-01-01T12:00:00Z',
        endsAt: '2030-01-01T10:00:00Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a group from another program', async () => {
    const svc = service({ groups: { findOne: jest.fn().mockResolvedValue({ ...group, program: { id: 'p2' } }) } });
    await expect(
      svc.create({
        moduleId: 'm1',
        groupId: 'g1',
        startsAt: '2030-01-01T10:00:00Z',
        endsAt: '2030-01-01T12:00:00Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('detects a room overlap', async () => {
    const svc = service({
      repo: {
        find: jest.fn().mockResolvedValue([
          { room: 'A1', teacher: { id: 'other' }, group: { id: 'other' } },
        ]),
      },
    });
    await expect(
      svc.create({
        moduleId: 'm1',
        groupId: 'g1',
        startsAt: '2030-01-01T10:00:00Z',
        endsAt: '2030-01-01T12:00:00Z',
        room: 'A1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

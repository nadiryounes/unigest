import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GradesService } from './grades.service';
import { UserRole } from '../entities/user.entity';

describe('GradesService', () => {
  const student = { id: 's1', program: { id: 'p1' } };
  const assessment = {
    id: 'a1',
    maxValue: 20,
    academicYear: { id: 'y1' },
    module: { program: { id: 'p1' }, teacher: { id: 't1' } },
  };

  function service(overrides: any = {}) {
    const repo: any = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'g1', ...value })),
      ...overrides.repo,
    };
    const students: any = {
      findOne: jest.fn().mockResolvedValue(student),
      ...overrides.students,
    };
    const assessments: any = {
      findOne: jest.fn().mockResolvedValue(assessment),
      ...overrides.assessments,
    };
    const enrollments: any = {
      findOne: jest.fn().mockResolvedValue({ id: 'e1' }),
      ...overrides.enrollments,
    };
    return { svc: new GradesService(repo, students, assessments, enrollments), repo };
  }

  it('creates a valid grade for an enrolled student', async () => {
    const { svc, repo } = service();
    const result = await svc.create({ role: UserRole.ADMIN } as any, {
      studentId: 's1',
      assessmentId: 'a1',
      value: 14,
    });
    expect(result.value).toBe(14);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('rejects a value above the assessment maximum', async () => {
    const { svc } = service();
    await expect(
      svc.create({ role: UserRole.ADMIN } as any, {
        studentId: 's1',
        assessmentId: 'a1',
        value: 21,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents a teacher from grading another teacher assessment', async () => {
    const { svc } = service();
    await expect(
      svc.create(
        { role: UserRole.TEACHER, teacherProfile: { id: 'other' } } as any,
        { studentId: 's1', assessmentId: 'a1', value: 12 },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

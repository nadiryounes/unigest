import { DeliberationsService } from './deliberations.service';
import { ValidationRuleType } from '../entities/validation-rule.entity';

describe('DeliberationsService', () => {
  function service(withGrade = true) {
    const enrollments: any = {
      find: jest.fn().mockResolvedValue([
        {
          student: { id: 's1', firstName: 'Test', lastName: 'Student', program: { id: 'p1' } },
          group: { academicLevel: { id: 'l1' } },
        },
      ]),
    };
    const modules: any = {
      find: jest.fn().mockResolvedValue([
        { id: 'm1', code: 'M1', name: 'Module 1', coefficient: 1, semester: 1 },
      ]),
    };
    const assessments: any = {
      find: jest.fn().mockResolvedValue([
        { id: 'a1', module: { id: 'm1' }, maxValue: 20, weight: 1 },
      ]),
    };
    const grades: any = {
      find: jest.fn().mockResolvedValue(
        withGrade ? [{ student: { id: 's1' }, assessment: { id: 'a1' }, value: 12 }] : [],
      ),
    };
    const rules: any = {
      find: jest.fn().mockResolvedValue([
        { type: ValidationRuleType.MODULE_PASS_MARK, numericValue: 10, level: { id: 'l1' }, program: { id: 'p1' } },
        { type: ValidationRuleType.SEMESTER_PASS_MARK, numericValue: 10, level: { id: 'l1' }, program: { id: 'p1' } },
        { type: ValidationRuleType.COMPENSATION_ALLOWED, booleanValue: true, level: { id: 'l1' }, program: { id: 'p1' } },
      ]),
    };
    return new DeliberationsService(enrollments, modules, assessments, grades, rules);
  }

  it('proposes validation when complete averages satisfy the rules', async () => {
    const result = await service(true).semester('y1', 'p1', 1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].semesterAverage).toBe(12);
    expect(result.results[0].proposal).toBe('VALIDATED');
  });

  it('marks a semester incomplete when a required grade is missing', async () => {
    const result = await service(false).semester('y1', 'p1', 1);
    expect(result.results[0].proposal).toBe('INCOMPLETE');
    expect(result.results[0].semesterAverage).toBeNull();
  });
});

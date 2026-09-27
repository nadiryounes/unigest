import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from '../entities/enrollment.entity';
import { AcademicModule } from '../entities/academic-module.entity';
import { Assessment } from '../entities/assessment.entity';
import { Grade } from '../entities/grade.entity';
import { ValidationRule, ValidationRuleType } from '../entities/validation-rule.entity';

@Injectable()
export class DeliberationsService {
  constructor(
    @InjectRepository(Enrollment) private enrollments: Repository<Enrollment>,
    @InjectRepository(AcademicModule) private modules: Repository<AcademicModule>,
    @InjectRepository(Assessment) private assessments: Repository<Assessment>,
    @InjectRepository(Grade) private grades: Repository<Grade>,
    @InjectRepository(ValidationRule) private rules: Repository<ValidationRule>,
  ) {}

  private pickRule(rules: ValidationRule[], type: ValidationRuleType, programId: string, levelId?: string) {
    return rules.find(r => r.type === type && !!levelId && r.level?.id === levelId)
      || rules.find(r => r.type === type && !r.level && r.program?.id === programId)
      || rules.find(r => r.type === type && !r.level && !r.program);
  }

  async semester(academicYearId: string, programId: string, semester: number, manualThreshold?: number) {
    if (!academicYearId || !programId || !semester) throw new BadRequestException('Année, filière et semestre requis');
    const enrollments = await this.enrollments.find({ where: { academicYear: { id: academicYearId } }, relations: { student: { program: true }, academicYear: true, group: { academicLevel: true } } });
    const selected = enrollments.filter(e => e.student.program?.id === programId);
    const modules = (await this.modules.find({ where: { program: { id: programId } } })).filter(m => m.semester === semester || m.semesterRef?.ordinal === semester);
    const assessments = (await this.assessments.find({ where: { academicYear: { id: academicYearId } } })).filter(a => modules.some(m => m.id === a.module.id));
    const allGrades = await this.grades.find();
    const rules = (await this.rules.find()).filter(r => !r.program || r.program.id === programId);

    const results = selected.map(enrollment => {
      const levelId = enrollment.group?.academicLevel?.id;
      const modulePassMark = manualThreshold ?? this.pickRule(rules, ValidationRuleType.MODULE_PASS_MARK, programId, levelId)?.numericValue ?? 10;
      const semesterPassMark = manualThreshold ?? this.pickRule(rules, ValidationRuleType.SEMESTER_PASS_MARK, programId, levelId)?.numericValue ?? 10;
      const eliminatoryMark = this.pickRule(rules, ValidationRuleType.ELIMINATORY_MARK, programId, levelId)?.numericValue;
      const compensationAllowed = this.pickRule(rules, ValidationRuleType.COMPENSATION_ALLOWED, programId, levelId)?.booleanValue ?? true;

      const moduleResults = modules.map(module => {
        const ass = assessments.filter(a => a.module.id === module.id);
        let weighted = 0, totalWeight = 0, completed = 0;
        for (const a of ass) {
          const g = allGrades.find(x => x.student.id === enrollment.student.id && x.assessment.id === a.id);
          if (g) { weighted += (g.value / a.maxValue * 20) * a.weight; totalWeight += a.weight; completed++; }
        }
        const average = totalWeight ? weighted / totalWeight : null;
        return { moduleId: module.id, code: module.code, name: module.name, coefficient: module.coefficient, average: average === null ? null : Number(average.toFixed(2)), completedAssessments: completed, totalAssessments: ass.length, validated: average !== null && average >= modulePassMark };
      });

      const available = moduleResults.filter(m => m.average !== null);
      const denom = available.reduce((s,m) => s + m.coefficient, 0);
      const semesterAverage = denom ? available.reduce((s,m) => s + (m.average as number) * m.coefficient, 0) / denom : null;
      const incomplete = moduleResults.some(m => m.totalAssessments > 0 && m.completedAssessments < m.totalAssessments) || available.length !== modules.length;
      const eliminatoryFailure = eliminatoryMark !== undefined && available.some(m => (m.average as number) < eliminatoryMark);
      const allModulesValidated = moduleResults.length > 0 && moduleResults.every(m => m.validated);
      let proposal = 'INCOMPLETE';
      if (!incomplete && semesterAverage !== null) {
        const compensated = compensationAllowed ? semesterAverage >= semesterPassMark : allModulesValidated;
        proposal = compensated && !eliminatoryFailure ? 'VALIDATED' : 'NOT_VALIDATED';
      }
      return { student: enrollment.student, group: enrollment.group, semesterAverage: semesterAverage === null ? null : Number(semesterAverage.toFixed(2)), proposal, rulesApplied: { modulePassMark, semesterPassMark, eliminatoryMark: eliminatoryMark ?? null, compensationAllowed }, modules: moduleResults };
    });

    return { academicYearId, programId, semester, manualThreshold: manualThreshold ?? null, generatedAt: new Date().toISOString(), results };
  }
}

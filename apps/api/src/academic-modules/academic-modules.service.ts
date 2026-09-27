import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicModule } from '../entities/academic-module.entity';
import { Program } from '../entities/program.entity';
import { Teacher } from '../entities/teacher.entity';
import { AcademicSemester } from '../entities/academic-semester.entity';

@Injectable()
export class AcademicModulesService {
  constructor(
    @InjectRepository(AcademicModule) private repo: Repository<AcademicModule>,
    @InjectRepository(Program) private programs: Repository<Program>,
    @InjectRepository(Teacher) private teachers: Repository<Teacher>,
    @InjectRepository(AcademicSemester) private semesters: Repository<AcademicSemester>,
  ) {}

  findAll() {
    return this.repo.find({ order: { semester: 'ASC', code: 'ASC' } });
  }

  async create(b: any) {
    const program = b.programId
      ? (await this.programs.findOne({ where: { id: b.programId } })) ?? undefined
      : undefined;
    const teacher = b.teacherId
      ? (await this.teachers.findOne({ where: { id: b.teacherId } })) ?? undefined
      : undefined;
    const semesterRef = b.semesterRefId
      ? (await this.semesters.findOne({ where: { id: b.semesterRefId } })) ?? undefined
      : undefined;

    if (b.programId && !program) throw new NotFoundException('Filière introuvable');
    if (b.teacherId && !teacher) throw new NotFoundException('Enseignant introuvable');
    if (b.semesterRefId && !semesterRef) throw new NotFoundException('Semestre académique introuvable');

    return this.repo.save(
      this.repo.create({
        code: b.code,
        name: b.name,
        semester: Number(b.semester || semesterRef?.ordinal || 1),
        coefficient: Number(b.coefficient || 1),
        program: program || semesterRef?.level.program,
        semesterRef,
        teacher,
      }),
    );
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicModule } from '../entities/academic-module.entity';
import { Program } from '../entities/program.entity';
import { Teacher } from '../entities/teacher.entity';
import { AcademicSemester } from '../entities/academic-semester.entity';

@Injectable()
export class AcademicModulesService {
  constructor(
    @InjectRepository(AcademicModule) private readonly repo: Repository<AcademicModule>,
    @InjectRepository(Program) private readonly programs: Repository<Program>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(AcademicSemester) private readonly semesters: Repository<AcademicSemester>,
  ) {}

  findAll() {
    return this.repo.find({ order: { semester: 'ASC', code: 'ASC' } });
  }

  async create(body: any) {
    const code = String(body.code || '').trim().toUpperCase();
    const name = String(body.name || '').trim();
    if (!code || !name) throw new BadRequestException('Code et nom du module requis');
    if (await this.repo.findOne({ where: { code } })) {
      throw new BadRequestException('Un module utilise déjà ce code');
    }

    const program = body.programId
      ? (await this.programs.findOne({ where: { id: body.programId } })) ?? undefined
      : undefined;
    const teacher = body.teacherId
      ? (await this.teachers.findOne({ where: { id: body.teacherId } })) ?? undefined
      : undefined;
    const semesterRef = body.semesterRefId
      ? (await this.semesters.findOne({ where: { id: body.semesterRefId } })) ?? undefined
      : undefined;

    if (body.programId && !program) throw new NotFoundException('Filière introuvable');
    if (body.teacherId && !teacher) throw new NotFoundException('Enseignant introuvable');
    if (body.semesterRefId && !semesterRef) {
      throw new NotFoundException('Semestre académique introuvable');
    }
    if (program && semesterRef && semesterRef.level.program.id !== program.id) {
      throw new BadRequestException('Le semestre ne correspond pas à la filière du module');
    }

    const semester = Number(body.semester || semesterRef?.ordinal || 1);
    const coefficient = Number(body.coefficient ?? 1);
    if (!Number.isInteger(semester) || semester < 1) {
      throw new BadRequestException('Numéro de semestre invalide');
    }
    if (!Number.isFinite(coefficient) || coefficient <= 0) {
      throw new BadRequestException('Coefficient du module invalide');
    }

    return this.repo.save(
      this.repo.create({
        code,
        name,
        semester,
        coefficient,
        program: program || semesterRef?.level.program,
        semesterRef,
        teacher,
      }),
    );
  }
}

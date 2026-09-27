import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentGroup } from '../entities/student-group.entity';
import { Program } from '../entities/program.entity';
import { AcademicYear } from '../entities/academic-year.entity';
import { AcademicLevel } from '../entities/academic-level.entity';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(StudentGroup) private readonly repo: Repository<StudentGroup>,
    @InjectRepository(Program) private readonly programs: Repository<Program>,
    @InjectRepository(AcademicYear) private readonly years: Repository<AcademicYear>,
    @InjectRepository(AcademicLevel) private readonly levels: Repository<AcademicLevel>,
  ) {}

  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async create(body: any) {
    const name = String(body.name || '').trim();
    if (!name) throw new BadRequestException('Nom du groupe requis');

    const program = await this.programs.findOne({ where: { id: body.programId } });
    const academicYear = await this.years.findOne({ where: { id: body.academicYearId } });
    const academicLevel = body.academicLevelId
      ? (await this.levels.findOne({ where: { id: body.academicLevelId } })) ?? undefined
      : undefined;

    if (!program || !academicYear) {
      throw new NotFoundException('Filière ou année universitaire introuvable');
    }
    if (body.academicLevelId && !academicLevel) {
      throw new NotFoundException('Niveau académique introuvable');
    }
    if (academicLevel && academicLevel.program.id !== program.id) {
      throw new BadRequestException('Le niveau ne correspond pas à la filière');
    }

    const level = Number(body.level || academicLevel?.levelNumber || 1);
    if (!Number.isInteger(level) || level < 1) {
      throw new BadRequestException('Niveau de groupe invalide');
    }

    const existing = await this.repo.findOne({
      where: {
        name,
        academicYear: { id: academicYear.id },
        program: { id: program.id },
      },
    });
    if (existing) throw new BadRequestException('Ce groupe existe déjà pour cette filière et cette année');

    return this.repo.save(
      this.repo.create({
        name,
        level,
        program,
        academicYear,
        academicLevel,
      }),
    );
  }
}

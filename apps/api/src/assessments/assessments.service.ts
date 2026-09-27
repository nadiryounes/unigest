import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assessment, AssessmentType } from '../entities/assessment.entity';
import { AcademicModule } from '../entities/academic-module.entity';
import { AcademicYear } from '../entities/academic-year.entity';
import { User, UserRole } from '../entities/user.entity';

@Injectable()
export class AssessmentsService {
  constructor(
    @InjectRepository(Assessment) private readonly repo: Repository<Assessment>,
    @InjectRepository(AcademicModule) private readonly modules: Repository<AcademicModule>,
    @InjectRepository(AcademicYear) private readonly years: Repository<AcademicYear>,
  ) {}

  async findAll(user: User) {
    const rows = await this.repo.find({ order: { name: 'ASC' } });
    if (user.role === UserRole.TEACHER) return user.teacherProfile ? rows.filter(a => a.module.teacher?.id === user.teacherProfile?.id) : [];
    return rows;
  }

  async create(user: User, body: any) {
    const module = await this.modules.findOne({ where: { id: body.moduleId } });
    const academicYear = await this.years.findOne({ where: { id: body.academicYearId } });
    if (!module || !academicYear) throw new NotFoundException('Module ou année introuvable');
    if (user.role === UserRole.TEACHER && (!user.teacherProfile || module.teacher?.id !== user.teacherProfile.id)) {
      throw new ForbiddenException('Ce module ne relève pas de cet enseignant');
    }
    const weight = Number(body.weight ?? 1), maxValue = Number(body.maxValue ?? 20);
    if (!Number.isFinite(weight) || !Number.isFinite(maxValue) || weight <= 0 || maxValue <= 0) throw new BadRequestException('Pondération ou barème invalide');
    return this.repo.save(this.repo.create({ name: body.name, type: (body.type || AssessmentType.CONTINUOUS) as AssessmentType, weight, maxValue, published: body.published === true || body.published === 'true', module, academicYear }));
  }

  async setPublished(user: User, id: string, published: boolean) {
    const assessment = await this.repo.findOne({ where: { id } });
    if (!assessment) throw new NotFoundException('Évaluation introuvable');
    if (user.role === UserRole.TEACHER && (!user.teacherProfile || assessment.module.teacher?.id !== user.teacherProfile.id)) {
      throw new ForbiddenException('Cette évaluation ne relève pas de cet enseignant');
    }
    assessment.published = !!published;
    return this.repo.save(assessment);
  }
}

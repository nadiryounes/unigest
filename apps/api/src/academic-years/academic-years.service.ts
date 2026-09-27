import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicYear } from '../entities/academic-year.entity';

@Injectable()
export class AcademicYearsService {
  constructor(@InjectRepository(AcademicYear) private readonly repo: Repository<AcademicYear>) {}

  findAll() {
    return this.repo.find({ order: { startsOn: 'DESC' } });
  }

  async create(body: any) {
    const label = String(body.label || '').trim();
    const startsOn = String(body.startsOn || '').trim();
    const endsOn = String(body.endsOn || '').trim();

    if (!label || !startsOn || !endsOn) throw new BadRequestException('Libellé et dates requis');

    const start = new Date(startsOn);
    const end = new Date(endsOn);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) {
      throw new BadRequestException('Dates invalides');
    }

    if (await this.repo.findOne({ where: { label } })) {
      throw new BadRequestException('Cette année universitaire existe déjà');
    }

    return this.repo.manager.transaction(async (manager) => {
      if (body.active) {
        await manager.createQueryBuilder().update(AcademicYear).set({ active: false }).execute();
      }
      return manager.save(
        AcademicYear,
        manager.create(AcademicYear, {
          label,
          startsOn,
          endsOn,
          active: !!body.active,
        }),
      );
    });
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Program } from '../entities/program.entity';

@Injectable()
export class ProgramsService {
  constructor(@InjectRepository(Program) private readonly repo: Repository<Program>) {}

  findAll() {
    return this.repo.find({ order: { code: 'ASC' } });
  }

  async create(body: any) {
    const code = String(body.code || '').trim().toUpperCase();
    const name = String(body.name || '').trim();
    const durationYears = Number(body.durationYears ?? 5);

    if (!code || !name) throw new BadRequestException('Code et nom de filière requis');
    if (!Number.isInteger(durationYears) || durationYears < 1 || durationYears > 10) {
      throw new BadRequestException('Durée de filière invalide');
    }
    if (await this.repo.findOne({ where: { code } })) {
      throw new BadRequestException('Une filière utilise déjà ce code');
    }

    return this.repo.save(
      this.repo.create({
        code,
        name,
        durationYears,
        active: body.active !== false,
      }),
    );
  }
}

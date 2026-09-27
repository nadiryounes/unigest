import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teacher } from '../entities/teacher.entity';

@Injectable()
export class TeachersService {
  constructor(@InjectRepository(Teacher) private readonly repo: Repository<Teacher>) {}

  findAll() {
    return this.repo.find({ order: { lastName: 'ASC' } });
  }

  async create(body: any) {
    const employeeNumber = String(body.employeeNumber || '').trim();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();

    if (!employeeNumber || !firstName || !lastName || !email) {
      throw new BadRequestException('Matricule, prénom, nom et email requis');
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new BadRequestException('Email invalide');
    }

    const duplicate = await this.repo.findOne({
      where: [{ employeeNumber }, { email }],
    });
    if (duplicate) throw new BadRequestException('Matricule ou email enseignant déjà utilisé');

    return this.repo.save(
      this.repo.create({
        employeeNumber,
        firstName,
        lastName,
        email,
        department: String(body.department || '').trim() || undefined,
      }),
    );
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../entities/student.entity';
import { Program } from '../entities/program.entity';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student) private readonly repo: Repository<Student>,
    @InjectRepository(Program) private readonly programs: Repository<Program>,
  ) {}

  findAll() {
    return this.repo.find({ relations: { program: true }, order: { lastName: 'ASC' } });
  }

  async create(body: any) {
    const studentNumber = String(body.studentNumber || '').trim();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();

    if (!studentNumber || !firstName || !lastName || !email) {
      throw new BadRequestException('Matricule, prénom, nom et email requis');
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new BadRequestException('Email invalide');
    }

    const duplicate = await this.repo.findOne({
      where: [{ studentNumber }, { email }],
    });
    if (duplicate) throw new BadRequestException('Matricule ou email étudiant déjà utilisé');

    let program: Program | undefined;
    if (body.programId) {
      program = (await this.programs.findOne({ where: { id: body.programId } })) || undefined;
      if (!program) throw new NotFoundException('Filière introuvable');
      if (!program.active) throw new BadRequestException('Cette filière est inactive');
    }

    return this.repo.save(
      this.repo.create({
        studentNumber,
        firstName,
        lastName,
        email,
        phone: String(body.phone || '').trim() || undefined,
        program,
      }),
    );
  }

  async importRows(rows: any[]) {
    if (!Array.isArray(rows) || !rows.length) {
      throw new BadRequestException('Aucune ligne à importer');
    }

    const programs = await this.programs.find();
    const report = { created: 0, updated: 0, errors: [] as { row: number; message: string }[] };

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index] || {};
      try {
        const studentNumber = String(row.studentNumber || row.numero || row['Numéro'] || '').trim();
        const firstName = String(row.firstName || row.prenom || row['Prénom'] || '').trim();
        const lastName = String(row.lastName || row.nom || row['Nom'] || '').trim();
        const email = String(row.email || row['Email'] || '').trim().toLowerCase();

        if (!studentNumber || !firstName || !lastName || !email) {
          throw new Error('Numéro, prénom, nom et email requis');
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          throw new Error('Email invalide');
        }

        const programCode = String(row.programCode || row.filiere || row['Filière'] || '').trim();
        const program = programCode
          ? programs.find((item) => item.code.toLowerCase() === programCode.toLowerCase())
          : undefined;
        if (programCode && !program) throw new Error(`Filière ${programCode} introuvable`);

        let student = await this.repo.findOne({ where: { studentNumber } });
        const emailOwner = await this.repo.findOne({ where: { email } });
        if (emailOwner && emailOwner.id !== student?.id) {
          throw new Error('Email déjà utilisé par un autre étudiant');
        }

        const isNew = !student;
        if (!student) student = this.repo.create({ studentNumber });

        student.firstName = firstName;
        student.lastName = lastName;
        student.email = email;
        student.phone = row.phone || row.telephone || row['Téléphone'] || undefined;
        student.program = program;
        await this.repo.save(student);

        if (isNew) report.created++;
        else report.updated++;
      } catch (error: any) {
        report.errors.push({ row: index + 2, message: error.message || 'Erreur' });
      }
    }

    return report;
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from '../entities/enrollment.entity';
import { Student } from '../entities/student.entity';
import { AcademicYear } from '../entities/academic-year.entity';
import { StudentGroup } from '../entities/student-group.entity';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment) private readonly repo: Repository<Enrollment>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(AcademicYear) private readonly years: Repository<AcademicYear>,
    @InjectRepository(StudentGroup) private readonly groups: Repository<StudentGroup>,
  ) {}

  findAll() {
    return this.repo.find({ order: { registeredAt: 'DESC' } });
  }

  async create(body: any) {
    const student = await this.students.findOne({
      where: { id: body.studentId },
      relations: { program: true },
    });
    const academicYear = await this.years.findOne({ where: { id: body.academicYearId } });
    const group = body.groupId
      ? (await this.groups.findOne({ where: { id: body.groupId } })) ?? undefined
      : undefined;

    if (!student || !academicYear || (body.groupId && !group)) {
      throw new NotFoundException('Étudiant, année ou groupe introuvable');
    }

    if (group) {
      if (group.academicYear.id !== academicYear.id) {
        throw new BadRequestException('Le groupe ne correspond pas à l’année universitaire');
      }
      if (student.program?.id && group.program.id !== student.program.id) {
        throw new BadRequestException('Le groupe ne correspond pas à la filière de l’étudiant');
      }
    }

    const existing = await this.repo.findOne({
      where: {
        student: { id: student.id },
        academicYear: { id: academicYear.id },
      },
    });
    if (existing) throw new BadRequestException('Cet étudiant est déjà inscrit pour cette année');

    return this.repo.save(
      this.repo.create({
        student,
        academicYear,
        group,
        status: String(body.status || 'ENROLLED').trim() || 'ENROLLED',
      }),
    );
  }
}

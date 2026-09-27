import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Grade } from '../entities/grade.entity';
import { Student } from '../entities/student.entity';
import { Assessment } from '../entities/assessment.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { User, UserRole } from '../entities/user.entity';

@Injectable()
export class GradesService {
  constructor(
    @InjectRepository(Grade) private readonly repo: Repository<Grade>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Assessment) private readonly assessments: Repository<Assessment>,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
  ) {}

  async findAll(user: User) {
    const rows = await this.repo.find({ order: { student: { lastName: 'ASC' } } });
    if (user.role === UserRole.ADMIN || user.role === UserRole.SCOLARITE) return rows;
    if (user.role === UserRole.TEACHER) {
      if (!user.teacherProfile) return [];
      return rows.filter(g => g.assessment.module.teacher?.id === user.teacherProfile?.id);
    }
    if (user.role === UserRole.STUDENT) {
      if (!user.studentProfile) return [];
      return rows.filter(g => g.student.id === user.studentProfile?.id && g.assessment.published);
    }
    return [];
  }

  async create(user: User, body: any) {
    const student = await this.students.findOne({ where: { id: body.studentId }, relations: { program: true } });
    const assessment = await this.assessments.findOne({ where: { id: body.assessmentId } });
    if (!student || !assessment) throw new NotFoundException('Étudiant ou évaluation introuvable');
    if (user.role === UserRole.TEACHER && (!user.teacherProfile || assessment.module.teacher?.id !== user.teacherProfile.id)) {
      throw new ForbiddenException('Cette évaluation ne relève pas de cet enseignant');
    }
    const enrollment = await this.enrollments.findOne({ where: { student: { id: student.id }, academicYear: { id: assessment.academicYear.id } } });
    if (!enrollment) throw new BadRequestException("L'étudiant n'est pas inscrit pour l'année de cette évaluation");
    if (assessment.module.program?.id && student.program?.id && assessment.module.program.id !== student.program.id) {
      throw new BadRequestException("L'évaluation et l'étudiant n'appartiennent pas à la même filière");
    }
    const value = Number(body.value);
    if (!Number.isFinite(value) || value < 0 || value > assessment.maxValue) throw new BadRequestException(`Note invalide (0-${assessment.maxValue})`);
    let row = await this.repo.findOne({ where: { student: { id: student.id }, assessment: { id: assessment.id } } });
    if (!row) row = this.repo.create({ student, assessment, value });
    row.value = value;
    row.note = body.note;
    return this.repo.save(row);
  }
}

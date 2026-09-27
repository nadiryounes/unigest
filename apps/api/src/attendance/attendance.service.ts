import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from '../entities/attendance.entity';
import { ClassSession } from '../entities/class-session.entity';
import { Student } from '../entities/student.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { User, UserRole } from '../entities/user.entity';

const ATTENDANCE_STATUSES = new Set(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance) private readonly repo: Repository<Attendance>,
    @InjectRepository(ClassSession) private readonly sessions: Repository<ClassSession>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
  ) {}

  async findAll(user: User) {
    const rows = await this.repo.find();
    if (user.role === UserRole.ADMIN || user.role === UserRole.SCOLARITE) return rows;
    if (user.role === UserRole.TEACHER) {
      return user.teacherProfile
        ? rows.filter((attendance) => attendance.session.teacher?.id === user.teacherProfile?.id)
        : [];
    }
    if (user.role === UserRole.STUDENT) {
      return user.studentProfile
        ? rows.filter((attendance) => attendance.student.id === user.studentProfile?.id)
        : [];
    }
    return [];
  }

  async create(user: User, body: any) {
    const session = await this.sessions.findOne({ where: { id: body.sessionId } });
    const student = await this.students.findOne({ where: { id: body.studentId } });
    if (!session || !student) throw new NotFoundException('Séance ou étudiant introuvable');

    if (
      user.role === UserRole.TEACHER &&
      (!user.teacherProfile || session.teacher?.id !== user.teacherProfile.id)
    ) {
      throw new ForbiddenException('Cette séance ne relève pas de cet enseignant');
    }

    if (session.group) {
      const enrollment = await this.enrollments.findOne({
        where: { student: { id: student.id }, group: { id: session.group.id } },
      });
      if (!enrollment) {
        throw new BadRequestException('L’étudiant n’appartient pas au groupe de cette séance');
      }
    }

    const status = String(body.status || 'PRESENT').trim().toUpperCase();
    if (!ATTENDANCE_STATUSES.has(status)) {
      throw new BadRequestException('Statut de présence invalide');
    }

    let row = await this.repo.findOne({
      where: { session: { id: session.id }, student: { id: student.id } },
    });
    if (!row) row = this.repo.create({ session, student });

    row.status = status;
    row.note = String(body.note || '').trim() || undefined;
    return this.repo.save(row);
  }
}

import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { Grade } from '../entities/grade.entity';
import { Attendance } from '../entities/attendance.entity';
import { ClassSession } from '../entities/class-session.entity';
import { AcademicModule } from '../entities/academic-module.entity';
import { Assessment } from '../entities/assessment.entity';

@Injectable()
export class PortalService {
  constructor(
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(Grade) private readonly grades: Repository<Grade>,
    @InjectRepository(Attendance) private readonly attendance: Repository<Attendance>,
    @InjectRepository(ClassSession) private readonly sessions: Repository<ClassSession>,
    @InjectRepository(AcademicModule) private readonly modules: Repository<AcademicModule>,
    @InjectRepository(Assessment) private readonly assessments: Repository<Assessment>,
  ) {}

  private requireStudent(user: User) {
    if (user.role !== UserRole.STUDENT || !user.studentProfile) throw new ForbiddenException('Compte étudiant non lié à un dossier académique');
    return user.studentProfile;
  }
  private requireTeacher(user: User) {
    if (user.role !== UserRole.TEACHER || !user.teacherProfile) throw new ForbiddenException('Compte enseignant non lié à un dossier enseignant');
    return user.teacherProfile;
  }

  async studentSummary(user: User) {
    const student = this.requireStudent(user);
    const enrollments = await this.enrollments.find({ where: { student: { id: student.id } }, order: { registeredAt: 'DESC' } });
    const allGrades = (await this.grades.find()).filter(g => g.student.id === student.id && g.assessment.published);
    const absences = (await this.attendance.find()).filter(a => a.student.id === student.id && a.status !== 'PRESENT');
    const active = enrollments.find(e => e.academicYear.active) || enrollments[0];
    return { student, activeEnrollment: active || null, publishedGrades: allGrades.length, absences: absences.length };
  }

  async studentGrades(user: User) {
    const student = this.requireStudent(user);
    return (await this.grades.find({ order: { assessment: { name: 'ASC' } } })).filter(g => g.student.id === student.id && g.assessment.published);
  }

  async studentAttendance(user: User) {
    const student = this.requireStudent(user);
    return (await this.attendance.find()).filter(a => a.student.id === student.id);
  }

  async studentSchedule(user: User) {
    const student = this.requireStudent(user);
    const enrollments = await this.enrollments.find({ where: { student: { id: student.id } } });
    const groupIds = new Set(enrollments.map(e => e.group?.id).filter(Boolean));
    return (await this.sessions.find({ order: { startsAt: 'ASC' } })).filter(s => !!s.group?.id && groupIds.has(s.group.id));
  }

  async teacherSummary(user: User) {
    const teacher = this.requireTeacher(user);
    const modules = (await this.modules.find()).filter(m => m.teacher?.id === teacher.id);
    const upcoming = (await this.sessions.find({ where: { startsAt: MoreThanOrEqual(new Date()) }, order: { startsAt: 'ASC' }, take: 100 })).filter(s => s.teacher?.id === teacher.id).slice(0, 10);
    const assessments = (await this.assessments.find()).filter(a => a.module.teacher?.id === teacher.id);
    return { teacher, modulesCount: modules.length, assessmentsCount: assessments.length, upcoming };
  }

  async teacherModules(user: User) {
    const teacher = this.requireTeacher(user);
    return (await this.modules.find({ order: { semester: 'ASC', name: 'ASC' } })).filter(m => m.teacher?.id === teacher.id);
  }

  async teacherStudents(user: User) {
    const teacher = this.requireTeacher(user);
    const sessions = (await this.sessions.find()).filter(s => s.teacher?.id === teacher.id && !!s.group?.id);
    const groupIds = new Set(sessions.map(s => s.group?.id).filter(Boolean));
    const enrollments = await this.enrollments.find();
    const seen = new Set<string>();
    const rows = enrollments.filter(e => !!e.group?.id && groupIds.has(e.group.id));
    return rows.filter(e => { if (seen.has(e.student.id)) return false; seen.add(e.student.id); return true; }).map(e => e.student);
  }

  async teacherSchedule(user: User) {
    const teacher = this.requireTeacher(user);
    return (await this.sessions.find({ order: { startsAt: 'ASC' } })).filter(s => s.teacher?.id === teacher.id);
  }
}

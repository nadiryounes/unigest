import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Student } from '../entities/student.entity';
import { Teacher } from '../entities/teacher.entity';
import { Program } from '../entities/program.entity';
import { AcademicModule } from '../entities/academic-module.entity';
import { ClassSession } from '../entities/class-session.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { Assessment } from '../entities/assessment.entity';
import { Application, ApplicationStatus } from '../entities/application.entity';
import { ApplicationCampaign, CampaignStatus } from '../entities/application-campaign.entity';
import { AcademicYear } from '../entities/academic-year.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Student) private students: Repository<Student>,
    @InjectRepository(Teacher) private teachers: Repository<Teacher>,
    @InjectRepository(Program) private programs: Repository<Program>,
    @InjectRepository(AcademicModule) private modules: Repository<AcademicModule>,
    @InjectRepository(ClassSession) private sessions: Repository<ClassSession>,
    @InjectRepository(Enrollment) private enrollments: Repository<Enrollment>,
    @InjectRepository(Assessment) private assessments: Repository<Assessment>,
    @InjectRepository(Application) private applications: Repository<Application>,
    @InjectRepository(ApplicationCampaign) private campaigns: Repository<ApplicationCampaign>,
    @InjectRepository(AcademicYear) private academicYears: Repository<AcademicYear>,
  ) {}

  async stats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      students,
      teachers,
      programs,
      modules,
      sessions,
      enrollments,
      assessments,
      applications,
      campaigns,
      activeAcademicYear,
      openCampaigns,
      submittedApplications,
      recentApplications,
      upcomingSessions,
    ] = await Promise.all([
      this.students.count(),
      this.teachers.count(),
      this.programs.count(),
      this.modules.count(),
      this.sessions.count(),
      this.enrollments.count(),
      this.assessments.count(),
      this.applications.count(),
      this.campaigns.count(),
      this.academicYears.findOne({ where: { active: true }, order: { startsOn: 'DESC' } }),
      this.campaigns.count({ where: { status: CampaignStatus.OPEN } }),
      this.applications.count({ where: { status: ApplicationStatus.SUBMITTED } }),
      this.applications.find({ order: { submittedAt: 'DESC' }, take: 5 }),
      this.sessions.find({
        where: { startsAt: MoreThanOrEqual(new Date()) },
        order: { startsAt: 'ASC' },
        take: 5,
      }),
    ]);

    const [applicationStatusRows, studentProgramRows, todaySessionRows] = await Promise.all([
      this.applications
        .createQueryBuilder('application')
        .select('application.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('application.status')
        .orderBy('COUNT(*)', 'DESC')
        .getRawMany(),
      this.students
        .createQueryBuilder('student')
        .leftJoin('student.program', 'program')
        .select("COALESCE(program.code, 'Sans filière')", 'label')
        .addSelect('COUNT(student.id)', 'count')
        .groupBy('program.code')
        .orderBy('COUNT(student.id)', 'DESC')
        .getRawMany(),
      this.sessions
        .createQueryBuilder('session')
        .select('COUNT(*)', 'count')
        .where('session.startsAt >= :todayStart', { todayStart })
        .andWhere('session.startsAt < :tomorrow', { tomorrow })
        .getRawOne(),
    ]);

    return {
      students,
      teachers,
      programs,
      modules,
      sessions,
      enrollments,
      assessments,
      applications,
      campaigns,
      openCampaigns,
      submittedApplications,
      todaySessions: Number(todaySessionRows?.count || 0),
      activeAcademicYear: activeAcademicYear?.label || null,
      applicationsByStatus: applicationStatusRows.map((row) => ({
        label: row.status,
        value: Number(row.count || 0),
      })),
      studentsByProgram: studentProgramRows.map((row) => ({
        label: row.label,
        value: Number(row.count || 0),
      })),
      recentApplications: recentApplications.map((application) => ({
        id: application.id,
        applicationNumber: application.applicationNumber,
        candidate: `${application.candidate?.firstName || ''} ${application.candidate?.lastName || ''}`.trim(),
        program: application.program?.code || '—',
        status: application.status,
        submittedAt: application.submittedAt,
      })),
      upcomingSessions: upcomingSessions.map((session) => ({
        id: session.id,
        module: session.module?.code || session.module?.name || '—',
        group: session.group?.name || session.groupName || '—',
        room: session.room || '—',
        startsAt: session.startsAt,
      })),
    };
  }
}

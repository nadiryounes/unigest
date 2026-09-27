import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { TeachersModule } from './teachers/teachers.module';
import { ProgramsModule } from './programs/programs.module';
import { AcademicModulesModule } from './academic-modules/academic-modules.module';
import { ScheduleModule } from './schedule/schedule.module';
import { AttendanceModule } from './attendance/attendance.module';
import { GradesModule } from './grades/grades.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AcademicYearsModule } from './academic-years/academic-years.module';
import { GroupsModule } from './groups/groups.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { DeliberationsModule } from './deliberations/deliberations.module';
import { DocumentsModule } from './documents/documents.module';
import { PortalModule } from './portal/portal.module';
import { AuditModule } from './audit/audit.module';
import { AcademicStructureModule } from './academic-structure/academic-structure.module';
import { AdmissionsModule } from './admissions/admissions.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { User } from './entities/user.entity';
import { Student } from './entities/student.entity';
import { Teacher } from './entities/teacher.entity';
import { Program } from './entities/program.entity';
import { AcademicModule } from './entities/academic-module.entity';
import { Enrollment } from './entities/enrollment.entity';
import { ClassSession } from './entities/class-session.entity';
import { Attendance } from './entities/attendance.entity';
import { Grade } from './entities/grade.entity';
import { AcademicYear } from './entities/academic-year.entity';
import { StudentGroup } from './entities/student-group.entity';
import { Assessment } from './entities/assessment.entity';
import { AuditLog } from './entities/audit-log.entity';
import { AcademicLevel } from './entities/academic-level.entity';
import { AcademicSemester } from './entities/academic-semester.entity';
import { ModuleElement } from './entities/module-element.entity';
import { ValidationRule } from './entities/validation-rule.entity';
import { ApplicationCampaign } from './entities/application-campaign.entity';
import { Candidate } from './entities/candidate.entity';
import { Application } from './entities/application.entity';
import { CandidateDocument } from './entities/candidate-document.entity';
import { SeedService } from './common/seed.service';
import { StorageModule } from './storage/storage.module';
import { HealthModule } from './health/health.module';

const entities = [User, Student, Teacher, Program, AcademicModule, Enrollment, ClassSession, Attendance, Grade, AcademicYear, StudentGroup, Assessment, AuditLog, AcademicLevel, AcademicSemester, ModuleElement, ValidationRule, ApplicationCampaign, Candidate, Application, CandidateDocument];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        const sslEnabled = String(config.get('DATABASE_SSL', databaseUrl ? 'true' : 'false')).toLowerCase() === 'true';
        const rejectUnauthorized =
          String(config.get('DATABASE_SSL_REJECT_UNAUTHORIZED', 'false')).toLowerCase() === 'true';
        const caBase64 = config.get<string>('DATABASE_SSL_CA_BASE64');
        const ssl = sslEnabled
          ? {
              rejectUnauthorized: caBase64 ? true : rejectUnauthorized,
              ...(caBase64 ? { ca: Buffer.from(caBase64, 'base64').toString('utf8') } : {}),
            }
          : false;

        return {
          type: 'postgres' as const,
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
                host: config.get('DATABASE_HOST', 'localhost'),
                port: Number(config.get('DATABASE_PORT', 5432)),
                username: config.get('DATABASE_USER', 'unigest'),
                password: config.get('DATABASE_PASSWORD', 'unigest'),
                database: config.get('DATABASE_NAME', 'unigest'),
              }),
          ssl,
          entities,
          synchronize: String(config.get('DB_SYNCHRONIZE', 'false')).toLowerCase() === 'true',
        };
      },
    }),
    TypeOrmModule.forFeature(entities),
    StorageModule,
    HealthModule,
    UsersModule,
    AuthModule,
    StudentsModule,
    TeachersModule,
    ProgramsModule,
    AcademicModulesModule,
    ScheduleModule,
    AttendanceModule,
    GradesModule,
    DashboardModule,
    AcademicYearsModule,
    GroupsModule,
    EnrollmentsModule,
    AssessmentsModule,
    DeliberationsModule,
    DocumentsModule,
    PortalModule,
    AuditModule,
    AcademicStructureModule,
    AdmissionsModule,
  ],
  providers: [SeedService, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
})
export class AppModule {}

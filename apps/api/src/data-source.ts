import 'reflect-metadata';
import { DataSource } from 'typeorm';
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
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { V02BaseSchema1770000000000 } from './migrations/1770000000000-V02BaseSchema';
import { V03ProfilesAndAudit1780000000000 } from './migrations/1780000000000-V03ProfilesAndAudit';
import { V04AcademicStructureAdmissions1790000000000 } from './migrations/1790000000000-V04AcademicStructureAdmissions';
import { V051SecurityHardening1800000000000 } from './migrations/1800000000000-V051SecurityHardening';

export const entities = [User, Student, Teacher, Program, AcademicModule, Enrollment, ClassSession, Attendance, Grade, AcademicYear, StudentGroup, Assessment, AuditLog, AcademicLevel, AcademicSemester, ModuleElement, ValidationRule, ApplicationCampaign, Candidate, Application, CandidateDocument, PasswordResetToken];

const databaseUrl = process.env.DATABASE_URL;
const sslEnabled = String(process.env.DATABASE_SSL || (databaseUrl ? 'true' : 'false')).toLowerCase() === 'true';
const rejectUnauthorized = String(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() === 'true';
const caBase64 = process.env.DATABASE_SSL_CA_BASE64;
const ssl = sslEnabled
  ? {
      rejectUnauthorized: caBase64 ? true : rejectUnauthorized,
      ...(caBase64 ? { ca: Buffer.from(caBase64, 'base64').toString('utf8') } : {}),
    }
  : false;

export default new DataSource({
  type: 'postgres',
  ...(databaseUrl
    ? { url: databaseUrl }
    : {
        host: process.env.DATABASE_HOST || 'localhost',
        port: Number(process.env.DATABASE_PORT || 5432),
        username: process.env.DATABASE_USER || 'unigest',
        password: process.env.DATABASE_PASSWORD || 'unigest',
        database: process.env.DATABASE_NAME || 'unigest',
      }),
  ssl,
  entities,
  migrations: [V02BaseSchema1770000000000, V03ProfilesAndAudit1780000000000, V04AcademicStructureAdmissions1790000000000, V051SecurityHardening1800000000000],
  synchronize: false,
});

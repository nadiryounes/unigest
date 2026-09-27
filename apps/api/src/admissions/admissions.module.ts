import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdmissionsController, PublicAdmissionsController } from './admissions.controller';
import { AdmissionsService } from './admissions.service';
import { ApplicationCampaign } from '../entities/application-campaign.entity';
import { Candidate } from '../entities/candidate.entity';
import { Application } from '../entities/application.entity';
import { CandidateDocument } from '../entities/candidate-document.entity';
import { AcademicYear } from '../entities/academic-year.entity';
import { Program } from '../entities/program.entity';
import { Student } from '../entities/student.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { StudentGroup } from '../entities/student-group.entity';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from '../common/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ApplicationCampaign, Candidate, Application, CandidateDocument, AcademicYear, Program, Student, Enrollment, StudentGroup]), UsersModule],
  controllers: [AdmissionsController, PublicAdmissionsController],
  providers: [AdmissionsService, RolesGuard],
  exports: [AdmissionsService],
})
export class AdmissionsModule {}

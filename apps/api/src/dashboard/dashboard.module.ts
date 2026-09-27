import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '../entities/student.entity';
import { Teacher } from '../entities/teacher.entity';
import { Program } from '../entities/program.entity';
import { AcademicModule } from '../entities/academic-module.entity';
import { ClassSession } from '../entities/class-session.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { Assessment } from '../entities/assessment.entity';
import { Application } from '../entities/application.entity';
import { ApplicationCampaign } from '../entities/application-campaign.entity';
import { AcademicYear } from '../entities/academic-year.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      Teacher,
      Program,
      AcademicModule,
      ClassSession,
      Enrollment,
      Assessment,
      Application,
      ApplicationCampaign,
      AcademicYear,
    ]),
    AuthModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

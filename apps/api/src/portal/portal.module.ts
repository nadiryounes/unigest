import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from '../entities/enrollment.entity';
import { Grade } from '../entities/grade.entity';
import { Attendance } from '../entities/attendance.entity';
import { ClassSession } from '../entities/class-session.entity';
import { AcademicModule } from '../entities/academic-module.entity';
import { Assessment } from '../entities/assessment.entity';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment, Grade, Attendance, ClassSession, AcademicModule, Assessment]), AuthModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}

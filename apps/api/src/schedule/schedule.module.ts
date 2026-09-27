import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassSession } from '../entities/class-session.entity';
import { AcademicModule } from '../entities/academic-module.entity';
import { Teacher } from '../entities/teacher.entity';
import { StudentGroup } from '../entities/student-group.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { AuthModule } from '../auth/auth.module';

@Module({ imports: [TypeOrmModule.forFeature([ClassSession, AcademicModule, Teacher, StudentGroup, Enrollment]), AuthModule], controllers: [ScheduleController], providers: [ScheduleService] })
export class ScheduleModule {}

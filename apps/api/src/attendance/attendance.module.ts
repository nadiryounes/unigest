import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from '../entities/attendance.entity';
import { ClassSession } from '../entities/class-session.entity';
import { Student } from '../entities/student.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AuthModule } from '../auth/auth.module';

@Module({ imports: [TypeOrmModule.forFeature([Attendance, ClassSession, Student, Enrollment]), AuthModule], controllers: [AttendanceController], providers: [AttendanceService] })
export class AttendanceModule {}

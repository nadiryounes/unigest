import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Grade } from '../entities/grade.entity';
import { Student } from '../entities/student.entity';
import { Assessment } from '../entities/assessment.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';
import { AuthModule } from '../auth/auth.module';

@Module({ imports: [TypeOrmModule.forFeature([Grade, Student, Assessment, Enrollment]), AuthModule], controllers: [GradesController], providers: [GradesService] })
export class GradesModule {}

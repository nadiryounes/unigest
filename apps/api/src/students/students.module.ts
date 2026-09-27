import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '../entities/student.entity'; import { Program } from '../entities/program.entity';
import { StudentsController } from './students.controller'; import { StudentsService } from './students.service'; import { AuthModule } from '../auth/auth.module';
@Module({ imports:[TypeOrmModule.forFeature([Student,Program]),AuthModule], controllers:[StudentsController], providers:[StudentsService] }) export class StudentsModule {}

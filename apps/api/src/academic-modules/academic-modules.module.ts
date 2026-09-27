import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicModule } from '../entities/academic-module.entity';
import { Program } from '../entities/program.entity';
import { Teacher } from '../entities/teacher.entity';
import { AcademicSemester } from '../entities/academic-semester.entity';
import { AcademicModulesController } from './academic-modules.controller';
import { AcademicModulesService } from './academic-modules.service';
import { AuthModule } from '../auth/auth.module';
@Module({ imports: [TypeOrmModule.forFeature([AcademicModule, Program, Teacher, AcademicSemester]), AuthModule], controllers: [AcademicModulesController], providers: [AcademicModulesService], exports: [AcademicModulesService] })
export class AcademicModulesModule {}

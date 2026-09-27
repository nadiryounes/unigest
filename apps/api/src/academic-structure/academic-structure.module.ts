import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicStructureController } from './academic-structure.controller';
import { AcademicStructureService } from './academic-structure.service';
import { AcademicLevel } from '../entities/academic-level.entity';
import { AcademicSemester } from '../entities/academic-semester.entity';
import { ModuleElement } from '../entities/module-element.entity';
import { ValidationRule } from '../entities/validation-rule.entity';
import { Program } from '../entities/program.entity';
import { AcademicModule } from '../entities/academic-module.entity';
import { Teacher } from '../entities/teacher.entity';
import { RolesGuard } from '../common/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicLevel, AcademicSemester, ModuleElement, ValidationRule, Program, AcademicModule, Teacher])],
  controllers: [AcademicStructureController],
  providers: [AcademicStructureService, RolesGuard],
  exports: [AcademicStructureService],
})
export class AcademicStructureModule {}

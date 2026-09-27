import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicYear } from '../entities/academic-year.entity';
import { AcademicYearsController } from './academic-years.controller';
import { AcademicYearsService } from './academic-years.service';
import { AuthModule } from '../auth/auth.module';
@Module({ imports:[TypeOrmModule.forFeature([AcademicYear]),AuthModule], controllers:[AcademicYearsController], providers:[AcademicYearsService] })
export class AcademicYearsModule {}

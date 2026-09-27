import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AcademicYearsService } from './academic-years.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('academic-years')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SCOLARITE, UserRole.TEACHER, UserRole.STUDENT)
export class AcademicYearsController {
  constructor(private readonly service: AcademicYearsService) {}
  @Get() all() { return this.service.findAll(); }
  @Post() @Roles(UserRole.ADMIN, UserRole.SCOLARITE) create(@Body() body: any) { return this.service.create(body); }
}

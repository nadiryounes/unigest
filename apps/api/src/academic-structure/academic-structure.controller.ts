import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AcademicStructureService } from './academic-structure.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('academic-structure')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicStructureController {
  constructor(private readonly service: AcademicStructureService) {}

  @Get('levels') levels() { return this.service.levels(); }
  @Post('levels') @Roles(UserRole.ADMIN, UserRole.SCOLARITE) createLevel(@Body() body: any) { return this.service.createLevel(body); }
  @Get('semesters') semesters() { return this.service.semesters(); }
  @Post('semesters') @Roles(UserRole.ADMIN, UserRole.SCOLARITE) createSemester(@Body() body: any) { return this.service.createSemester(body); }
  @Get('elements') elements() { return this.service.elements(); }
  @Post('elements') @Roles(UserRole.ADMIN, UserRole.SCOLARITE) createElement(@Body() body: any) { return this.service.createElement(body); }
  @Get('validation-rules') rules() { return this.service.rules(); }
  @Post('validation-rules') @Roles(UserRole.ADMIN, UserRole.SCOLARITE) createRule(@Body() body: any) { return this.service.createRule(body); }
}

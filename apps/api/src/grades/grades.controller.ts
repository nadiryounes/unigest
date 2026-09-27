import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { GradesService } from './grades.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SCOLARITE, UserRole.TEACHER, UserRole.STUDENT)
export class GradesController {
  constructor(private readonly service: GradesService) {}
  @Get() all(@Request() req: any) { return this.service.findAll(req.user); }
  @Post() @Roles(UserRole.ADMIN, UserRole.SCOLARITE, UserRole.TEACHER)
  create(@Request() req: any, @Body() body: any) { return this.service.create(req.user, body); }
}

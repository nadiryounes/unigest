import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SCOLARITE, UserRole.TEACHER, UserRole.STUDENT)
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}
  @Get() all(@Request() req: any) { return this.service.findAll(req.user); }
  @Post() @Roles(UserRole.ADMIN, UserRole.SCOLARITE) create(@Body() body: any) { return this.service.create(body); }
}

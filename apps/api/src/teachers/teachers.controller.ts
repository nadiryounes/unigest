import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SCOLARITE)
export class TeachersController {
  constructor(private readonly service: TeachersService) {}
  @Get() all() { return this.service.findAll(); }
  @Post() create(@Body() body: any) { return this.service.create(body); }
}

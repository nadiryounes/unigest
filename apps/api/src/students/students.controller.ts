import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SCOLARITE) export class StudentsController {
  constructor(private readonly service: StudentsService) {}
  @Get() all(){ return this.service.findAll(); }
  @Post() @Roles(UserRole.ADMIN, UserRole.SCOLARITE) create(@Body() body:any){ return this.service.create(body); }
  @Post('import') @Roles(UserRole.ADMIN, UserRole.SCOLARITE) importRows(@Body() body:any){ return this.service.importRows(body.rows || []); }
}

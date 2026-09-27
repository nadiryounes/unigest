import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('portal')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  @Get('student/summary') @Roles(UserRole.STUDENT) studentSummary(@Request() req: any) { return this.portal.studentSummary(req.user); }
  @Get('student/grades') @Roles(UserRole.STUDENT) studentGrades(@Request() req: any) { return this.portal.studentGrades(req.user); }
  @Get('student/attendance') @Roles(UserRole.STUDENT) studentAttendance(@Request() req: any) { return this.portal.studentAttendance(req.user); }
  @Get('student/schedule') @Roles(UserRole.STUDENT) studentSchedule(@Request() req: any) { return this.portal.studentSchedule(req.user); }

  @Get('teacher/summary') @Roles(UserRole.TEACHER) teacherSummary(@Request() req: any) { return this.portal.teacherSummary(req.user); }
  @Get('teacher/modules') @Roles(UserRole.TEACHER) teacherModules(@Request() req: any) { return this.portal.teacherModules(req.user); }
  @Get('teacher/students') @Roles(UserRole.TEACHER) teacherStudents(@Request() req: any) { return this.portal.teacherStudents(req.user); }
  @Get('teacher/schedule') @Roles(UserRole.TEACHER) teacherSchedule(@Request() req: any) { return this.portal.teacherSchedule(req.user); }
}

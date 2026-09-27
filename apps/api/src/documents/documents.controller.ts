import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { ForbiddenException } from '@nestjs/common';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get('transcript/:studentId')
  @Roles(UserRole.ADMIN, UserRole.SCOLARITE, UserRole.STUDENT)
  transcript(@Request() req: any, @Param('studentId') id: string, @Query('academicYearId') yearId: string) {
    if (req.user.role === UserRole.STUDENT && req.user.studentProfile?.id !== id) throw new ForbiddenException('Accès limité à votre propre relevé');
    return this.service.transcript(id, yearId, req.user.role === UserRole.STUDENT);
  }

  @Get('jury-report')
  @Roles(UserRole.ADMIN, UserRole.SCOLARITE)
  jury(@Query('academicYearId') yearId: string, @Query('programId') programId: string, @Query('semester') semester: string, @Query('threshold') threshold?: string) {
    return this.service.juryReport(yearId, programId, Number(semester || 1), Number(threshold || 10));
  }
}

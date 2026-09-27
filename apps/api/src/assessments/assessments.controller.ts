import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SCOLARITE, UserRole.TEACHER)
export class AssessmentsController {
  constructor(private readonly service: AssessmentsService) {}
  @Get() all(@Request() req: any) { return this.service.findAll(req.user); }
  @Post() create(@Request() req: any, @Body() body: any) { return this.service.create(req.user, body); }
  @Patch(':id/published') setPublished(@Request() req: any, @Param('id') id: string, @Body() body: { published: boolean }) { return this.service.setPublished(req.user, id, body.published); }
}

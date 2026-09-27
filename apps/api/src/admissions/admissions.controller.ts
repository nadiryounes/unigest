import { Body, Controller, Get, Param, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdmissionsService } from './admissions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('admissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SCOLARITE)
export class AdmissionsController {
  constructor(private readonly service: AdmissionsService) {}
  @Get('campaigns') campaigns() { return this.service.campaigns(false); }
  @Post('campaigns') createCampaign(@Body() body: any) { return this.service.createCampaign(body); }
  @Get('applications') applications(@Query('campaignId') campaignId?: string, @Query('status') status?: string) { return this.service.applications(campaignId, status); }
  @Get('applications/:id') application(@Param('id') id: string) { return this.service.applicationById(id); }
  @Get('applications/:id/documents/:documentId/download')
  async downloadDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Res() res: any,
  ) {
    const { document, buffer } = await this.service.downloadDocument(id, documentId);
    const safeName = String(document.originalName || 'document').replace(/[\r\n"]/g, '_');
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.send(buffer);
  }
  @Patch('applications/:id/status') updateStatus(@Param('id') id: string, @Body() body: any) { return this.service.updateStatus(id, body.status, body.decisionNote, body.score); }
  @Post('campaigns/:id/evaluate') evaluate(@Param('id') id: string) { return this.service.evaluateCampaign(id); }
  @Post('applications/:id/convert') convert(@Param('id') id: string, @Body() body: any) { return this.service.convertToStudent(id, body); }
  @Get('stats') stats() { return this.service.stats(); }
}

@Controller('admissions/public')
export class PublicAdmissionsController {
  constructor(private readonly service: AdmissionsService) {}
  @Get('campaigns') campaigns() { return this.service.campaigns(true); }
  @Get('programs') programs(@Query('campaignId') campaignId?: string) { return this.service.publicPrograms(campaignId); }
  @Post('apply') apply(@Body() body: any) { return this.service.submitApplication(body); }
  @Get('status') status(@Query('applicationNumber') applicationNumber: string, @Query('email') email: string) { return this.service.publicStatus(applicationNumber, email); }
  @Post('applications/:applicationNumber/documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(@Param('applicationNumber') applicationNumber: string, @Body() body: any, @UploadedFile() file: any) {
    return this.service.uploadDocument(applicationNumber, body.email, body.type, file);
  }
}

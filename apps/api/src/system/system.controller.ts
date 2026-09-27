import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SeedService } from '../common/seed.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('system')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SystemController {
  constructor(private readonly seed: SeedService) {}

  @Get('demo-status')
  demoStatus() {
    return this.seed.demoStatus();
  }

  @Post('demo-seed')
  loadDemoData() {
    return this.seed.loadDemoData();
  }
}

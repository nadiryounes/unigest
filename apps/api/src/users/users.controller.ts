import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get() list() { return this.users.listSafe(); }
  @Post() create(@Body() body: any) { return this.users.create(body); }
  @Patch(':id/active') setActive(@Param('id') id: string, @Body() body: { active: boolean }) { return this.users.setActive(id, body.active); }
}

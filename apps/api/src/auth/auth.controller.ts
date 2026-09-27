import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: { email: string }) {
    return this.auth.forgotPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.auth.resetPassword(body.token, body.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @Request() req: any,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.auth.changePassword(
      req.user,
      body.currentPassword,
      body.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  logoutAll(@Request() req: any) {
    return this.auth.logoutAll(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: any) {
    const user = req.user;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      studentProfileId: user.studentProfile?.id,
      teacherProfileId: user.teacherProfile?.id,
      passwordChangedAt: user.passwordChangedAt || null,
    };
  }
}

import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body?.email, body?.password);
  }

  @Post('mfa/verify')
  verifyMfa(@Body() body: { mfaToken: string; code: string }) {
    return this.auth.verifyMfaLogin(body?.mfaToken, body?.code);
  }

  @Post('password-reset/request')
  requestPasswordReset(@Body() body: { email: string }) {
    return this.auth.requestPasswordReset(body?.email);
  }

  @Post('password-reset/confirm')
  confirmPasswordReset(@Body() body: { token: string; newPassword: string }) {
    return this.auth.confirmPasswordReset(body?.token, body?.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: any) {
    const { passwordHash, ...safe } = req.user;
    return safe;
  }

  @UseGuards(JwtAuthGuard)
  @Get('security-status')
  securityStatus(@Request() req: any) {
    return this.auth.securityStatus(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/setup')
  setupMfa(@Request() req: any, @Body() body: { currentPassword: string }) {
    return this.auth.setupMfa(req.user.id, body?.currentPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/enable')
  enableMfa(@Request() req: any, @Body() body: { code: string }) {
    return this.auth.enableMfa(req.user.id, body?.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/disable')
  disableMfa(
    @Request() req: any,
    @Body() body: { currentPassword: string; code: string },
  ) {
    return this.auth.disableMfa(req.user.id, body?.currentPassword, body?.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @Request() req: any,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.auth.changePassword(req.user.id, body?.currentPassword, body?.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  logoutAll(@Request() req: any) {
    return this.auth.logoutAll(req.user.id);
  }
}

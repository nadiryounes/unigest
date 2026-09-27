import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Post('login') login(@Body() body: { email: string; password: string }) { return this.auth.login(body.email, body.password); }
  @UseGuards(JwtAuthGuard)
  @Get('me') me(@Request() req: any) {
    const { passwordHash, ...safe } = req.user;
    return safe;
  }
}

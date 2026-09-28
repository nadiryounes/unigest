import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly jwt: JwtService) {}

  async login(email: string, password: string) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');
    if (!normalizedEmail || !normalizedPassword) throw new UnauthorizedException('Identifiants invalides');

    let user = await this.users.findByEmail(normalizedEmail);
    if (!user || !user.active || !(await bcrypt.compare(normalizedPassword, user.passwordHash))) {
      user = (await this.users.ensureBootstrapAdmin(normalizedEmail, normalizedPassword)) ?? null;
    }
    if (!user || !user.active || !(await bcrypt.compare(normalizedPassword, user.passwordHash))) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      av: Number(user.authVersion || 0),
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        studentProfileId: user.studentProfile?.id,
        teacherProfileId: user.teacherProfile?.id,
      },
    };
  }

  changePassword(userId: string, currentPassword: string, newPassword: string) {
    return this.users.changePassword(userId, currentPassword, newPassword);
  }

  logoutAll(userId: string) {
    return this.users.revokeAllSessions(userId);
  }
}

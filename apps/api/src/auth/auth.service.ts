import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly jwt: JwtService) {}

  async login(email: string, password: string) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    let user = await this.users.findByEmail(normalizedEmail);

    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      user = (await this.users.ensureBootstrapAdmin(normalizedEmail, password)) ?? null;
    }

    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
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
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly jwt: JwtService) {}
  async login(email: string, password: string) {
    const user = await this.users.findByEmail(String(email || '').trim().toLowerCase());
    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) throw new UnauthorizedException('Identifiants invalides');
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
    return {
      accessToken,
      user: {
        id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role,
        studentProfileId: user.studentProfile?.id, teacherProfileId: user.teacherProfile?.id,
      },
    };
  }
}

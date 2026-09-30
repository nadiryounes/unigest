import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { AccountSecurityService } from './account-security.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly security: AccountSecurityService,
    private readonly mail: MailService,
  ) {}

  private safeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      studentProfileId: user.studentProfile?.id,
      teacherProfileId: user.teacherProfile?.id,
    };
  }

  private async issueAccessToken(user: any) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      av: Number(user.authVersion || 0),
      purpose: 'access',
    });

    return {
      accessToken,
      user: this.safeUser(user),
    };
  }

  async login(email: string, password: string) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');
    if (!normalizedEmail || !normalizedPassword) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    let user = await this.users.findByEmail(normalizedEmail);
    if (!user || !user.active || !(await bcrypt.compare(normalizedPassword, user.passwordHash))) {
      user = (await this.users.ensureBootstrapAdmin(normalizedEmail, normalizedPassword)) ?? null;
    }

    if (!user || !user.active || !(await bcrypt.compare(normalizedPassword, user.passwordHash))) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (await this.security.mfaEnabled(user.id)) {
      const mfaToken = await this.jwt.signAsync(
        {
          sub: user.id,
          av: Number(user.authVersion || 0),
          purpose: 'mfa',
        },
        { expiresIn: '5m' },
      );

      return {
        mfaRequired: true,
        mfaToken,
        user: {
          email: user.email,
          role: user.role,
        },
      };
    }

    return this.issueAccessToken(user);
  }

  async verifyMfaLogin(mfaToken: string, code: string) {
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(String(mfaToken || ''));
    } catch {
      throw new UnauthorizedException('Challenge MFA invalide ou expiré');
    }

    if (payload?.purpose !== 'mfa' || !payload?.sub) {
      throw new UnauthorizedException('Challenge MFA invalide ou expiré');
    }

    const user = await this.users.findById(payload.sub);
    if (!user || !user.active || Number(payload.av ?? 0) !== Number(user.authVersion || 0)) {
      throw new UnauthorizedException('Challenge MFA invalide ou expiré');
    }

    if (!(await this.security.verifyMfa(user.id, code))) {
      throw new UnauthorizedException('Code MFA invalide');
    }

    return this.issueAccessToken(user);
  }

  async requestPasswordReset(email: string) {
    const issued = await this.security.createPasswordReset(email);
    let delivered = false;

    if (issued) {
      try {
        delivered = await this.mail.sendPasswordReset(issued.user.email, issued.token);
      } catch (error) {
        console.error('UniGest password reset email delivery failed', error);
      }
    }

    const response: Record<string, unknown> = {
      accepted: true,
      message: 'Si ce compte existe, un lien de réinitialisation sera envoyé.',
    };

    if (
      issued &&
      process.env.NODE_ENV === 'test' &&
      String(process.env.PASSWORD_RESET_TEST_MODE || '').toLowerCase() === 'true'
    ) {
      response.testToken = issued.token;
    }

    if (process.env.NODE_ENV !== 'production') response.delivered = delivered;
    return response;
  }

  confirmPasswordReset(token: string, newPassword: string) {
    return this.security.confirmPasswordReset(token, newPassword);
  }

  changePassword(userId: string, currentPassword: string, newPassword: string) {
    return this.users.changePassword(userId, currentPassword, newPassword);
  }

  logoutAll(userId: string) {
    return this.users.revokeAllSessions(userId);
  }

  securityStatus(userId: string) {
    return this.security.status(userId);
  }

  setupMfa(userId: string, currentPassword: string) {
    return this.security.setupMfa(userId, currentPassword);
  }

  enableMfa(userId: string, code: string) {
    return this.security.enableMfa(userId, code);
  }

  disableMfa(userId: string, currentPassword: string, code: string) {
    return this.security.disableMfa(userId, currentPassword, code);
  }
}

import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokens: Repository<PasswordResetToken>,
  ) {}

  private safeUser(user: User) {
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

  async login(email: string, password: string) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');
    if (!normalizedEmail || !normalizedPassword) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    let user = await this.users.findByEmail(normalizedEmail);

    if (user && this.users.isTemporarilyLocked(user)) {
      throw new HttpException(
        'Trop de tentatives. Réessayez dans quelques minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    let passwordValid =
      !!user &&
      user.active &&
      (await bcrypt.compare(normalizedPassword, user.passwordHash));

    if (!passwordValid && user?.active) {
      await this.users.registerFailedLogin(user);
    }

    if (!user) {
      user =
        (await this.users.ensureBootstrapAdmin(
          normalizedEmail,
          normalizedPassword,
        )) ?? null;
      passwordValid =
        !!user &&
        user.active &&
        (await bcrypt.compare(normalizedPassword, user.passwordHash));
    }

    if (!user || !user.active || !passwordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    user = await this.users.clearLoginFailures(user);
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      ver: Number(user.tokenVersion || 0),
    });

    return {
      accessToken,
      user: this.safeUser(user),
    };
  }

  async changePassword(user: User, currentPassword: string, newPassword: string) {
    const current = String(currentPassword || '');
    const next = String(newPassword || '');
    if (!(await bcrypt.compare(current, user.passwordHash))) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }
    if (current === next) {
      throw new BadRequestException('Le nouveau mot de passe doit être différent');
    }
    await this.users.setPassword(user, next);
    return {
      message: 'Mot de passe modifié. Toutes les sessions existantes ont été révoquées.',
    };
  }

  async logoutAll(user: User) {
    await this.users.revokeSessions(user.id);
    return { message: 'Toutes les sessions ont été révoquées.' };
  }

  private resetHash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async deliverResetEmail(email: string, rawToken: string) {
    const resetBase =
      String(process.env.PASSWORD_RESET_WEB_URL || '').trim() ||
      'http://localhost:3000/reset-password';
    const resetUrl = `${resetBase}?token=${encodeURIComponent(rawToken)}`;
    const apiKey = String(process.env.RESEND_API_KEY || '').trim();
    const from = String(process.env.EMAIL_FROM || '').trim();

    if (!apiKey || !from) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`UniGest password reset for ${email}: ${resetUrl}`);
      } else {
        console.warn(
          'Password reset requested but RESEND_API_KEY/EMAIL_FROM are not configured.',
        );
      }
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: 'Réinitialisation de votre mot de passe UniGest',
          text:
            'Une demande de réinitialisation a été reçue. ' +
            `Ouvrez ce lien dans les 30 minutes : ${resetUrl}`,
        }),
      });

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        console.error(
          `Password reset email delivery failed (${response.status}) ${details}`,
        );
      }
    } catch (error) {
      console.error('Password reset email delivery failed', error);
    }
  }

  async forgotPassword(email: string) {
    const generic = {
      message:
        'Si un compte actif correspond à cette adresse, un lien de réinitialisation sera envoyé.',
    };
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return generic;

    const user = await this.users.findByEmail(normalizedEmail);
    if (!user || !user.active) return generic;

    await this.resetTokens.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    const rawToken = randomBytes(32).toString('hex');
    await this.resetTokens.save(
      this.resetTokens.create({
        userId: user.id,
        tokenHash: this.resetHash(rawToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      }),
    );

    await this.deliverResetEmail(user.email, rawToken);

    if (
      process.env.NODE_ENV !== 'production' &&
      String(process.env.PASSWORD_RESET_EXPOSE_TOKEN || '').toLowerCase() ===
        'true'
    ) {
      return { ...generic, resetToken: rawToken };
    }

    return generic;
  }

  async resetPassword(token: string, newPassword: string) {
    const rawToken = String(token || '').trim();
    if (!rawToken) throw new BadRequestException('Jeton de réinitialisation invalide');

    const row = await this.resetTokens.findOne({
      where: { tokenHash: this.resetHash(rawToken), usedAt: IsNull() },
    });
    if (!row || row.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Jeton de réinitialisation invalide ou expiré');
    }

    const user = await this.users.findById(row.userId);
    if (!user || !user.active) {
      throw new BadRequestException('Jeton de réinitialisation invalide ou expiré');
    }

    await this.users.setPassword(user, String(newPassword || ''));
    await this.resetTokens.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    return {
      message: 'Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.',
    };
  }
}

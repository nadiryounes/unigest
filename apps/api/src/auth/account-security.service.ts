import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { UserSecurity } from '../entities/user-security.entity';
import { UsersService } from '../users/users.service';
import {
  decryptMfaSecret,
  encryptMfaSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  recoveryCodeHash,
  verifyTotp,
} from '../common/mfa';

function missingSecurityTable(error: any) {
  return error?.code === '42P01';
}

@Injectable()
export class AccountSecurityService {
  constructor(
    @InjectRepository(UserSecurity) private readonly securityRepo: Repository<UserSecurity>,
    @InjectRepository(PasswordResetToken) private readonly resetRepo: Repository<PasswordResetToken>,
    private readonly users: UsersService,
  ) {}

  async status(userId: string) {
    try {
      const row = await this.securityRepo.findOne({ where: { userId } });
      const user = await this.users.findById(userId);
      return {
        available: true,
        mfaEnabled: !!row?.mfaEnabled,
        recoveryCodesRemaining: row?.recoveryCodeHashes?.length || 0,
        passwordChangedAt: user?.passwordChangedAt || null,
      };
    } catch (error) {
      if (missingSecurityTable(error)) {
        return {
          available: false,
          mfaEnabled: false,
          recoveryCodesRemaining: 0,
          passwordChangedAt: null,
        };
      }
      throw error;
    }
  }

  async mfaEnabled(userId: string) {
    try {
      const row = await this.securityRepo.findOne({ where: { userId } });
      return !!row?.mfaEnabled;
    } catch (error) {
      if (missingSecurityTable(error)) return false;
      throw error;
    }
  }

  async setupMfa(userId: string, currentPassword: string) {
    const user = await this.users.findById(userId);
    if (!user || !user.active) throw new UnauthorizedException('Compte introuvable');
    if (!(await bcrypt.compare(String(currentPassword || ''), user.passwordHash))) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    const secret = generateTotpSecret();
    const encrypted = encryptMfaSecret(secret);

    try {
      let row = await this.securityRepo.findOne({ where: { userId } });
      if (!row) row = this.securityRepo.create({ userId, mfaEnabled: false });
      row.mfaEnabled = false;
      row.mfaSecretEncrypted = encrypted;
      row.recoveryCodeHashes = [];
      await this.securityRepo.save(row);
    } catch (error) {
      if (missingSecurityTable(error)) {
        throw new ServiceUnavailableException('Migration de sécurité V06 requise');
      }
      throw error;
    }

    const issuer = String(process.env.MFA_ISSUER || 'UniGest');
    const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
    return { secret, uri };
  }

  async enableMfa(userId: string, code: string) {
    const row = await this.securityRepo.findOne({ where: { userId } });
    if (!row?.mfaSecretEncrypted) throw new BadRequestException('Configuration MFA non initialisée');

    const secret = decryptMfaSecret(row.mfaSecretEncrypted);
    if (!verifyTotp(secret, code)) throw new BadRequestException('Code MFA invalide');

    const recoveryCodes = generateRecoveryCodes();
    row.mfaEnabled = true;
    row.recoveryCodeHashes = recoveryCodes.map(recoveryCodeHash);
    await this.securityRepo.save(row);
    return { enabled: true, recoveryCodes };
  }

  async verifyMfa(userId: string, code: string) {
    const row = await this.securityRepo.findOne({ where: { userId } });
    if (!row?.mfaEnabled || !row.mfaSecretEncrypted) return false;

    const secret = decryptMfaSecret(row.mfaSecretEncrypted);
    if (verifyTotp(secret, code)) return true;

    const hash = recoveryCodeHash(code);
    const hashes = row.recoveryCodeHashes || [];
    const index = hashes.indexOf(hash);
    if (index < 0) return false;

    row.recoveryCodeHashes = hashes.filter((_, i) => i !== index);
    await this.securityRepo.save(row);
    return true;
  }

  async disableMfa(userId: string, currentPassword: string, code: string) {
    const user = await this.users.findById(userId);
    if (!user || !(await bcrypt.compare(String(currentPassword || ''), user.passwordHash))) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }
    if (!(await this.verifyMfa(userId, code))) throw new BadRequestException('Code MFA invalide');

    const row = await this.securityRepo.findOne({ where: { userId } });
    if (row) {
      row.mfaEnabled = false;
      row.mfaSecretEncrypted = undefined;
      row.recoveryCodeHashes = [];
      await this.securityRepo.save(row);
    }

    await this.users.revokeAllSessions(userId);
    return { disabled: true };
  }

  async createPasswordReset(email: string) {
    const normalized = String(email || '').trim().toLowerCase();
    const user = await this.users.findByEmail(normalized);
    if (!user?.active) return undefined;

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    try {
      await this.resetRepo.delete({ userId: user.id });
      await this.resetRepo.save(this.resetRepo.create({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 60_000),
      }));
      return { token, user };
    } catch (error) {
      if (missingSecurityTable(error)) return undefined;
      throw error;
    }
  }

  async confirmPasswordReset(token: string, newPassword: string) {
    const raw = String(token || '').trim();
    if (raw.length < 32) {
      throw new BadRequestException('Lien de réinitialisation invalide ou expiré');
    }

    const tokenHash = createHash('sha256').update(raw).digest('hex');
    const row = await this.resetRepo.findOne({
      where: {
        tokenHash,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!row) throw new BadRequestException('Lien de réinitialisation invalide ou expiré');

    await this.users.setPassword(row.userId, newPassword);
    row.usedAt = new Date();
    await this.resetRepo.save(row);
    return { reset: true };
  }
}

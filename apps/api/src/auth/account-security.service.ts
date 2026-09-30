import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
      if (row?.mfaEnabled) {
        throw new BadRequestException('MFA est déjà activée. Désactivez-la avant de la reconfigurer.');
      }
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
      row.mfaSecretEncrypted = null;
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
    const next = String(newPassword || '');
    if (raw.length < 32) {
      throw new BadRequestException('Lien de réinitialisation invalide ou expiré');
    }
    if (next.length < 12) {
      throw new BadRequestException('Le nouveau mot de passe doit contenir au moins 12 caractères');
    }

    const tokenHash = createHash('sha256').update(raw).digest('hex');

    try {
      return await this.resetRepo.manager.transaction(async (manager) => {
        const rows = await manager.query(
          `SELECT pr."id", pr."userId", u."passwordHash", u."active"
           FROM "password_reset_tokens" pr
           JOIN "users" u ON u."id" = pr."userId"
           WHERE pr."tokenHash" = $1
             AND pr."usedAt" IS NULL
             AND pr."expiresAt" > now()
           FOR UPDATE OF pr, u`,
          [tokenHash],
        );

        const record = rows?.[0];
        if (!record?.active) {
          throw new BadRequestException('Lien de réinitialisation invalide ou expiré');
        }
        if (await bcrypt.compare(next, record.passwordHash)) {
          throw new BadRequestException('Le nouveau mot de passe doit être différent de l’ancien');
        }

        const passwordHash = await bcrypt.hash(next, 12);
        await manager.query(
          `UPDATE "users"
           SET "passwordHash" = $1,
               "passwordChangedAt" = now(),
               "authVersion" = COALESCE("authVersion", 0) + 1,
               "updatedAt" = now()
           WHERE "id" = $2`,
          [passwordHash, record.userId],
        );
        await manager.query(
          'UPDATE "password_reset_tokens" SET "usedAt" = now() WHERE "id" = $1',
          [record.id],
        );

        return { reset: true };
      });
    } catch (error) {
      if (missingSecurityTable(error)) {
        throw new ServiceUnavailableException('Migration de sécurité V06 requise');
      }
      throw error;
    }
  }
}

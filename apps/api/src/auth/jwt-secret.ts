import { ConfigService } from '@nestjs/config';

export function resolveJwtSecret(config: ConfigService): string {
  const secret = String(config.get<string>('JWT_SECRET') || '');
  const production =
    String(config.get<string>('NODE_ENV') || process.env.NODE_ENV || '').toLowerCase() === 'production' ||
    !!process.env.VERCEL;

  if (production && secret.length < 32) {
    throw new Error('JWT_SECRET doit contenir au moins 32 caractères en production.');
  }

  return secret || 'local-development-only-change-me';
}

import {
  decryptMfaSecret,
  encryptMfaSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  recoveryCodeHash,
  totpCode,
  verifyTotp,
} from './mfa';

describe('MFA primitives', () => {
  const previous = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.MFA_ENCRYPTION_KEY = 'test-mfa-encryption-key-that-is-long-enough';
  });

  afterAll(() => {
    process.env = previous;
  });

  it('generates and verifies time based codes', () => {
    const secret = generateTotpSecret();
    const at = Date.UTC(2030, 0, 1, 12, 0, 0);
    const code = totpCode(secret, at);
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotp(secret, code, at)).toBe(true);
    expect(verifyTotp(secret, '000000', at)).toBe(false);
  });

  it('encrypts MFA secrets at rest', () => {
    const secret = generateTotpSecret();
    const encrypted = encryptMfaSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(decryptMfaSecret(encrypted)).toBe(secret);
  });

  it('generates unique one-time recovery codes and stable hashes', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    expect(recoveryCodeHash(codes[0])).toBe(recoveryCodeHash(codes[0].toLowerCase()));
  });
});

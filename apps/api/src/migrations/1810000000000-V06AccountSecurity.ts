import { MigrationInterface, QueryRunner } from 'typeorm';

export class V06AccountSecurity1810000000000 implements MigrationInterface {
  name = 'V06AccountSecurity1810000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "user_security" (
      "userId" uuid NOT NULL,
      "mfaEnabled" boolean NOT NULL DEFAULT false,
      "mfaSecretEncrypted" text,
      "recoveryCodeHashes" jsonb,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_user_security" PRIMARY KEY ("userId"),
      CONSTRAINT "FK_user_security_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "userId" uuid NOT NULL,
      "tokenHash" varchar NOT NULL,
      "expiresAt" timestamp NOT NULL,
      "usedAt" timestamp,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_password_reset_tokens_hash" UNIQUE ("tokenHash"),
      CONSTRAINT "FK_password_reset_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_password_reset_tokens_user" ON "password_reset_tokens" ("userId")');

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
      "scope" varchar NOT NULL,
      "keyHash" varchar NOT NULL,
      "count" integer NOT NULL DEFAULT 0,
      "resetAt" timestamp NOT NULL,
      "updatedAt" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_rate_limit_buckets" PRIMARY KEY ("scope","keyHash")
    )`);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_rate_limit_buckets_reset" ON "rate_limit_buckets" ("resetAt")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "rate_limit_buckets"');
    await queryRunner.query('DROP TABLE IF EXISTS "password_reset_tokens"');
    await queryRunner.query('DROP TABLE IF EXISTS "user_security"');
  }
}

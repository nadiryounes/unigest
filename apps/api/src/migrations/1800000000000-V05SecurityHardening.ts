import { MigrationInterface, QueryRunner } from 'typeorm';

export class V05SecurityHardening1800000000000 implements MigrationInterface {
  name = 'V05SecurityHardening1800000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "authVersion" integer NOT NULL DEFAULT 0');
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordChangedAt" timestamp');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordChangedAt"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "authVersion"');
  }
}

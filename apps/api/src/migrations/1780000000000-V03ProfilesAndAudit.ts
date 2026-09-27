import { MigrationInterface, QueryRunner } from 'typeorm';

export class V03ProfilesAndAudit1780000000000 implements MigrationInterface {
  name = 'V03ProfilesAndAudit1780000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "studentProfileId" uuid`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "teacherProfileId" uuid`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_student_profile_unique" ON "users" ("studentProfileId") WHERE "studentProfileId" IS NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_teacher_profile_unique" ON "users" ("teacherProfileId") WHERE "teacherProfileId" IS NOT NULL`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_users_student_profile') THEN ALTER TABLE "users" ADD CONSTRAINT "FK_users_student_profile" FOREIGN KEY ("studentProfileId") REFERENCES "students"("id") ON DELETE SET NULL; END IF; END $$;`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_users_teacher_profile') THEN ALTER TABLE "users" ADD CONSTRAINT "FK_users_teacher_profile" FOREIGN KEY ("teacherProfileId") REFERENCES "teachers"("id") ON DELETE SET NULL; END IF; END $$;`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "actorUserId" character varying,
      "actorEmail" character varying,
      "actorRole" character varying,
      "method" character varying NOT NULL,
      "path" character varying NOT NULL,
      "action" character varying NOT NULL,
      "resource" character varying NOT NULL,
      "resourceId" character varying,
      "details" jsonb,
      "ip" character varying,
      "success" boolean NOT NULL DEFAULT true,
      "errorMessage" character varying,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt" DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_actorUserId" ON "audit_logs" ("actorUserId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_teacher_profile"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_student_profile"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_teacher_profile_unique"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_student_profile_unique"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "teacherProfileId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "studentProfileId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "updatedAt"`);
  }
}

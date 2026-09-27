import { MigrationInterface, QueryRunner } from 'typeorm';

export class V04AcademicStructureAdmissions1790000000000 implements MigrationInterface {
  name = 'V04AcademicStructureAdmissions1790000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "academic_levels" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" varchar NOT NULL, "name" varchar NOT NULL,
      "levelNumber" integer NOT NULL, "active" boolean NOT NULL DEFAULT true, "programId" uuid NOT NULL,
      CONSTRAINT "PK_academic_levels" PRIMARY KEY ("id"),
      CONSTRAINT "FK_academic_levels_program" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_academic_levels_program_number" ON "academic_levels" ("programId", "levelNumber")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "academic_semesters" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" varchar NOT NULL, "name" varchar NOT NULL,
      "ordinal" integer NOT NULL, "active" boolean NOT NULL DEFAULT true, "levelId" uuid NOT NULL,
      CONSTRAINT "PK_academic_semesters" PRIMARY KEY ("id"),
      CONSTRAINT "FK_academic_semesters_level" FOREIGN KEY ("levelId") REFERENCES "academic_levels"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_academic_semesters_level_ordinal" ON "academic_semesters" ("levelId", "ordinal")`);

    await queryRunner.query(`ALTER TABLE "student_groups" ADD COLUMN IF NOT EXISTS "academicLevelId" uuid`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FK_student_groups_academic_level') THEN ALTER TABLE "student_groups" ADD CONSTRAINT "FK_student_groups_academic_level" FOREIGN KEY ("academicLevelId") REFERENCES "academic_levels"("id") ON DELETE SET NULL; END IF; END $$;`);

    await queryRunner.query(`ALTER TABLE "academic_modules" ADD COLUMN IF NOT EXISTS "semesterRefId" uuid`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FK_academic_modules_semester_ref') THEN ALTER TABLE "academic_modules" ADD CONSTRAINT "FK_academic_modules_semester_ref" FOREIGN KEY ("semesterRefId") REFERENCES "academic_semesters"("id") ON DELETE SET NULL; END IF; END $$;`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "module_elements" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" varchar NOT NULL, "name" varchar NOT NULL,
      "coefficient" double precision NOT NULL DEFAULT 1, "volumeHours" double precision NOT NULL DEFAULT 0,
      "active" boolean NOT NULL DEFAULT true, "moduleId" uuid NOT NULL, "teacherId" uuid,
      CONSTRAINT "PK_module_elements" PRIMARY KEY ("id"),
      CONSTRAINT "FK_module_elements_module" FOREIGN KEY ("moduleId") REFERENCES "academic_modules"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_module_elements_teacher" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_module_elements_module_code" ON "module_elements" ("moduleId", "code")`);

    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "validation_rules_type_enum" AS ENUM ('MODULE_PASS_MARK','SEMESTER_PASS_MARK','ELIMINATORY_MARK','COMPENSATION_ALLOWED','RESIT_ALLOWED','CAPITALIZATION_ALLOWED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "validation_rules" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" "validation_rules_type_enum" NOT NULL,
      "numericValue" double precision, "booleanValue" boolean, "parameters" jsonb, "active" boolean NOT NULL DEFAULT true,
      "programId" uuid, "levelId" uuid,
      CONSTRAINT "PK_validation_rules" PRIMARY KEY ("id"),
      CONSTRAINT "FK_validation_rules_program" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_validation_rules_level" FOREIGN KEY ("levelId") REFERENCES "academic_levels"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "application_campaigns_status_enum" AS ENUM ('DRAFT','OPEN','CLOSED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "application_campaigns" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" varchar NOT NULL, "startsOn" date NOT NULL, "endsOn" date NOT NULL,
      "status" "application_campaigns_status_enum" NOT NULL DEFAULT 'DRAFT', "eligibilityRules" jsonb, "academicYearId" uuid NOT NULL,
      CONSTRAINT "PK_application_campaigns" PRIMARY KEY ("id"),
      CONSTRAINT "FK_application_campaigns_year" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "application_campaign_programs" (
      "applicationCampaignId" uuid NOT NULL, "programId" uuid NOT NULL,
      CONSTRAINT "PK_application_campaign_programs" PRIMARY KEY ("applicationCampaignId", "programId"),
      CONSTRAINT "FK_application_campaign_programs_campaign" FOREIGN KEY ("applicationCampaignId") REFERENCES "application_campaigns"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_application_campaign_programs_program" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_application_campaign_programs_program" ON "application_campaign_programs" ("programId")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "candidates" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(), "firstName" varchar NOT NULL, "lastName" varchar NOT NULL,
      "email" varchar NOT NULL, "phone" varchar, "nationalId" varchar, "birthDate" date, "city" varchar,
      "createdAt" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_candidates" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_candidates_email" ON "candidates" (lower("email"))`);

    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "applications_status_enum" AS ENUM ('SUBMITTED','INELIGIBLE','ELIGIBLE','SHORTLISTED','WAITLISTED','ADMITTED','REJECTED','ENROLLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "applications" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(), "applicationNumber" varchar NOT NULL,
      "status" "applications_status_enum" NOT NULL DEFAULT 'SUBMITTED', "score" double precision, "decisionNote" text,
      "formData" jsonb, "candidateId" uuid NOT NULL, "campaignId" uuid NOT NULL, "programId" uuid NOT NULL,
      "submittedAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_applications" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_applications_number" UNIQUE ("applicationNumber"),
      CONSTRAINT "FK_applications_candidate" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_applications_campaign" FOREIGN KEY ("campaignId") REFERENCES "application_campaigns"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_applications_program" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_applications_candidate_campaign_program" ON "applications" ("candidateId", "campaignId", "programId")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "candidate_documents" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" varchar NOT NULL, "originalName" varchar NOT NULL,
      "storageKey" varchar NOT NULL, "mimeType" varchar NOT NULL, "size" integer NOT NULL,
      "status" varchar NOT NULL DEFAULT 'RECEIVED', "reviewNote" varchar, "candidateId" uuid NOT NULL, "applicationId" uuid NOT NULL,
      "uploadedAt" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_candidate_documents" PRIMARY KEY ("id"),
      CONSTRAINT "FK_candidate_documents_candidate" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_candidate_documents_application" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "candidate_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "applications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "candidates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "application_campaign_programs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "application_campaigns"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "validation_rules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "module_elements"`);
    await queryRunner.query(`ALTER TABLE "academic_modules" DROP CONSTRAINT IF EXISTS "FK_academic_modules_semester_ref"`);
    await queryRunner.query(`ALTER TABLE "academic_modules" DROP COLUMN IF EXISTS "semesterRefId"`);
    await queryRunner.query(`ALTER TABLE "student_groups" DROP CONSTRAINT IF EXISTS "FK_student_groups_academic_level"`);
    await queryRunner.query(`ALTER TABLE "student_groups" DROP COLUMN IF EXISTS "academicLevelId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "academic_semesters"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "academic_levels"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "applications_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "application_campaigns_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "validation_rules_type_enum"`);
  }
}

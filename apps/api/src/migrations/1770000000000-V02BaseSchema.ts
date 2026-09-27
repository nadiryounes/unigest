import { MigrationInterface, QueryRunner } from 'typeorm';

export class V02BaseSchema1770000000000 implements MigrationInterface {
  name = 'V02BaseSchema1770000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "users_role_enum" AS ENUM ('ADMIN','SCOLARITE','TEACHER','STUDENT'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "assessments_type_enum" AS ENUM ('CONTINUOUS','EXAM','PROJECT','RESIT'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "programs" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "code" varchar NOT NULL,
      "name" varchar NOT NULL,
      "durationYears" integer NOT NULL DEFAULT 5,
      "active" boolean NOT NULL DEFAULT true,
      CONSTRAINT "PK_programs" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_programs_code" UNIQUE ("code")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "teachers" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "employeeNumber" varchar NOT NULL,
      "firstName" varchar NOT NULL,
      "lastName" varchar NOT NULL,
      "email" varchar NOT NULL,
      "department" varchar,
      CONSTRAINT "PK_teachers" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_teachers_employeeNumber" UNIQUE ("employeeNumber"),
      CONSTRAINT "UQ_teachers_email" UNIQUE ("email")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "students" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "studentNumber" varchar NOT NULL,
      "firstName" varchar NOT NULL,
      "lastName" varchar NOT NULL,
      "email" varchar NOT NULL,
      "phone" varchar,
      "status" varchar NOT NULL DEFAULT 'ACTIVE',
      "programId" uuid,
      CONSTRAINT "PK_students" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_students_studentNumber" UNIQUE ("studentNumber"),
      CONSTRAINT "UQ_students_email" UNIQUE ("email"),
      CONSTRAINT "FK_students_program" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE SET NULL
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "users" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "email" varchar NOT NULL,
      "passwordHash" varchar NOT NULL,
      "firstName" varchar NOT NULL,
      "lastName" varchar NOT NULL,
      "role" "users_role_enum" NOT NULL DEFAULT 'STUDENT',
      "active" boolean NOT NULL DEFAULT true,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_users" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_users_email" UNIQUE ("email")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "academic_years" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "label" varchar NOT NULL,
      "startsOn" date NOT NULL,
      "endsOn" date NOT NULL,
      "active" boolean NOT NULL DEFAULT false,
      CONSTRAINT "PK_academic_years" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_academic_years_label" UNIQUE ("label")
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "student_groups" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "name" varchar NOT NULL,
      "level" integer NOT NULL DEFAULT 1,
      "programId" uuid NOT NULL,
      "academicYearId" uuid NOT NULL,
      CONSTRAINT "PK_student_groups" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_student_groups_name_year_program" UNIQUE ("name","academicYearId","programId"),
      CONSTRAINT "FK_student_groups_program" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_student_groups_year" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "academic_modules" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "code" varchar NOT NULL,
      "name" varchar NOT NULL,
      "semester" integer NOT NULL DEFAULT 1,
      "coefficient" double precision NOT NULL DEFAULT 1,
      "programId" uuid,
      "teacherId" uuid,
      CONSTRAINT "PK_academic_modules" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_academic_modules_code" UNIQUE ("code"),
      CONSTRAINT "FK_academic_modules_program" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_academic_modules_teacher" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "enrollments" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "status" varchar NOT NULL DEFAULT 'ENROLLED',
      "registeredAt" timestamp NOT NULL DEFAULT now(),
      "studentId" uuid NOT NULL,
      "academicYearId" uuid NOT NULL,
      "groupId" uuid,
      CONSTRAINT "PK_enrollments" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_enrollments_student_year" UNIQUE ("studentId","academicYearId"),
      CONSTRAINT "FK_enrollments_student" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_enrollments_year" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_enrollments_group" FOREIGN KEY ("groupId") REFERENCES "student_groups"("id") ON DELETE SET NULL
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "class_sessions" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "startsAt" timestamp NOT NULL,
      "endsAt" timestamp NOT NULL,
      "room" varchar,
      "groupName" varchar,
      "moduleId" uuid NOT NULL,
      "teacherId" uuid,
      "groupId" uuid,
      CONSTRAINT "PK_class_sessions" PRIMARY KEY ("id"),
      CONSTRAINT "FK_class_sessions_module" FOREIGN KEY ("moduleId") REFERENCES "academic_modules"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_class_sessions_teacher" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_class_sessions_group" FOREIGN KEY ("groupId") REFERENCES "student_groups"("id") ON DELETE SET NULL
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "assessments" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "name" varchar NOT NULL,
      "type" "assessments_type_enum" NOT NULL DEFAULT 'CONTINUOUS',
      "weight" double precision NOT NULL DEFAULT 1,
      "maxValue" double precision NOT NULL DEFAULT 20,
      "published" boolean NOT NULL DEFAULT false,
      "moduleId" uuid NOT NULL,
      "academicYearId" uuid NOT NULL,
      CONSTRAINT "PK_assessments" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_assessments_module_year_name" UNIQUE ("moduleId","academicYearId","name"),
      CONSTRAINT "FK_assessments_module" FOREIGN KEY ("moduleId") REFERENCES "academic_modules"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_assessments_year" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "grades" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "value" double precision NOT NULL,
      "note" varchar,
      "studentId" uuid NOT NULL,
      "assessmentId" uuid NOT NULL,
      CONSTRAINT "PK_grades" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_grades_student_assessment" UNIQUE ("studentId","assessmentId"),
      CONSTRAINT "FK_grades_student" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_grades_assessment" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "attendance" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "status" varchar NOT NULL DEFAULT 'PRESENT',
      "note" varchar,
      "sessionId" uuid NOT NULL,
      "studentId" uuid NOT NULL,
      CONSTRAINT "PK_attendance" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_attendance_session_student" UNIQUE ("sessionId","studentId"),
      CONSTRAINT "FK_attendance_session" FOREIGN KEY ("sessionId") REFERENCES "class_sessions"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_attendance_student" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "grades"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assessments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "class_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "enrollments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "academic_modules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_groups"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "academic_years"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "students"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "teachers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "programs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "assessments_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}

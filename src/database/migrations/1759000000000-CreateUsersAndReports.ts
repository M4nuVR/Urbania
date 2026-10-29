import { MigrationInterface, QueryRunner } from 'typeorm';

// Base mínima de usuarios (Persona 1) y reportes (Persona 2). Va antes que
// AddLocationsAndEvidences porque esa migración referencia "reports".
// Cada dueño agrega sus campos con una migración nueva, sin editar esta.
export class CreateUsersAndReports1759000000000 implements MigrationInterface {
  name = 'CreateUsersAndReports1759000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "email" varchar(255) NOT NULL,
        "passwordHash" varchar(255) NOT NULL,
        "role" varchar(16) NOT NULL DEFAULT 'CITIZEN',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "CK_users_role" CHECK ("role" IN ('CITIZEN', 'AUTHORITY', 'ADMIN'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "reports" (
        "id" uuid NOT NULL,
        "title" varchar(200) NOT NULL,
        "description" text NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'REPORTED',
        "citizenId" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reports_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_reports_citizen_id" FOREIGN KEY ("citizenId")
          REFERENCES "users" ("id") ON DELETE RESTRICT,
        CONSTRAINT "CK_reports_status" CHECK (
          "status" IN ('REPORTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED')
        )
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_reports_citizen_id" ON "reports" ("citizenId")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_reports_status" ON "reports" ("status")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_reports_status"');
    await queryRunner.query('DROP INDEX "IDX_reports_citizen_id"');
    await queryRunner.query('DROP TABLE "reports"');
    await queryRunner.query('DROP TABLE "users"');
  }
}

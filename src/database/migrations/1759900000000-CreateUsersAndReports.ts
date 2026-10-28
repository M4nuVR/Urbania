import { MigrationInterface, QueryRunner } from 'typeorm';

// Debe correr antes de AddLocationsAndEvidences, que referencia "reports"
export class CreateUsersAndReports1759900000000 implements MigrationInterface {
  name = 'CreateUsersAndReports1759900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL,
        "email" varchar(255) NOT NULL,
        "fullName" varchar(120) NOT NULL,
        "passwordHash" varchar(255) NOT NULL,
        "role" varchar(16) NOT NULL DEFAULT 'CITIZEN',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_users_role" CHECK ("role" IN ('CITIZEN', 'ADMIN'))
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email")',
    );
    await queryRunner.query(`
      CREATE TABLE "reports" (
        "id" uuid NOT NULL,
        "ownerId" uuid NOT NULL,
        "title" varchar(150) NOT NULL,
        "description" varchar(2000) NOT NULL,
        "category" varchar(32) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'REPORTED',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reports_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_reports_owner_id" FOREIGN KEY ("ownerId")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "CK_reports_status" CHECK (
          "status" IN ('REPORTED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')
        ),
        CONSTRAINT "CK_reports_category" CHECK (
          "category" IN (
            'ROADS', 'LIGHTING', 'WASTE', 'PUBLIC_SPACE', 'SECURITY', 'OTHER'
          )
        )
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_reports_owner_id" ON "reports" ("ownerId")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_reports_status" ON "reports" ("status")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "idx_reports_status"');
    await queryRunner.query('DROP INDEX "idx_reports_owner_id"');
    await queryRunner.query('DROP TABLE "reports"');
    await queryRunner.query('DROP INDEX "uq_users_email"');
    await queryRunner.query('DROP TABLE "users"');
  }
}

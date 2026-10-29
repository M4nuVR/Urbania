import { MigrationInterface, QueryRunner } from 'typeorm';

const STATUSES = `'REPORTED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'`;

export class AddAssignmentsTrackingNotifications1761000000000 implements MigrationInterface {
  name = 'AddAssignmentsTrackingNotifications1761000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Nuevo rol AUTHORITY: usuario que atiende los reportes asignados
    await queryRunner.query(
      'ALTER TABLE "users" DROP CONSTRAINT "CK_users_role"',
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "CK_users_role" CHECK ("role" IN ('CITIZEN', 'AUTHORITY', 'ADMIN'))`,
    );

    await queryRunner.query(`
      CREATE TABLE "assignments" (
        "id" uuid NOT NULL,
        "reportId" uuid NOT NULL,
        "authorityId" uuid NOT NULL,
        "assignedBy" uuid NOT NULL,
        "assignedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assignments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_assignments_report_id" FOREIGN KEY ("reportId")
          REFERENCES "reports" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_assignments_authority_id" FOREIGN KEY ("authorityId")
          REFERENCES "users" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_assignments_assigned_by" FOREIGN KEY ("assignedBy")
          REFERENCES "users" ("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_assignments_report_id" ON "assignments" ("reportId")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_assignments_authority_id" ON "assignments" ("authorityId")',
    );

    await queryRunner.query(`
      CREATE TABLE "tracking" (
        "id" uuid NOT NULL,
        "reportId" uuid NOT NULL,
        "previousStatus" varchar(16),
        "newStatus" varchar(16) NOT NULL,
        "changedBy" uuid NOT NULL,
        "observation" varchar(1000),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tracking_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tracking_report_id" FOREIGN KEY ("reportId")
          REFERENCES "reports" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_tracking_changed_by" FOREIGN KEY ("changedBy")
          REFERENCES "users" ("id") ON DELETE RESTRICT,
        CONSTRAINT "CK_tracking_previous_status" CHECK (
          "previousStatus" IS NULL OR "previousStatus" IN (${STATUSES})
        ),
        CONSTRAINT "CK_tracking_new_status" CHECK ("newStatus" IN (${STATUSES}))
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_tracking_report_id_created_at" ON "tracking" ("reportId", "createdAt")',
    );

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "reportId" uuid NOT NULL,
        "type" varchar(16) NOT NULL,
        "message" varchar(500) NOT NULL,
        "readAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user_id" FOREIGN KEY ("userId")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_report_id" FOREIGN KEY ("reportId")
          REFERENCES "reports" ("id") ON DELETE RESTRICT,
        CONSTRAINT "CK_notifications_type" CHECK ("type" IN ('ASSIGNED', 'STATUS_CHANGED'))
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_notifications_user_id_created_at" ON "notifications" ("userId", "createdAt")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "notifications"');
    await queryRunner.query('DROP TABLE "tracking"');
    await queryRunner.query('DROP TABLE "assignments"');
    // Falla si quedan usuarios AUTHORITY: hay que reasignarles otro rol antes
    await queryRunner.query(
      'ALTER TABLE "users" DROP CONSTRAINT "CK_users_role"',
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "CK_users_role" CHECK ("role" IN ('CITIZEN', 'ADMIN'))`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocationsAndEvidences1760000000000 implements MigrationInterface {
  name = 'AddLocationsAndEvidences1760000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "locations" (
        "id" uuid NOT NULL,
        "reportId" uuid NOT NULL,
        "address" varchar(255),
        "neighborhood" varchar(120),
        "zone" varchar(120),
        "latitude" double precision,
        "longitude" double precision,
        CONSTRAINT "PK_locations_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_locations_report_id" UNIQUE ("reportId"),
        CONSTRAINT "FK_locations_report_id" FOREIGN KEY ("reportId")
          REFERENCES "reports" ("id") ON DELETE CASCADE,
        CONSTRAINT "CK_locations_text_reference" CHECK (
          NULLIF(BTRIM(COALESCE("address", '')), '') IS NOT NULL OR
          NULLIF(BTRIM(COALESCE("neighborhood", '')), '') IS NOT NULL
        ),
        CONSTRAINT "CK_locations_coordinates_pair" CHECK (
          ("latitude" IS NULL AND "longitude" IS NULL) OR
          ("latitude" IS NOT NULL AND "longitude" IS NOT NULL)
        ),
        CONSTRAINT "CK_locations_latitude_range" CHECK (
          "latitude" IS NULL OR "latitude" BETWEEN -90 AND 90
        ),
        CONSTRAINT "CK_locations_longitude_range" CHECK (
          "longitude" IS NULL OR "longitude" BETWEEN -180 AND 180
        )
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "evidences" (
        "id" uuid NOT NULL,
        "reportId" uuid NOT NULL,
        "url" varchar(2048) NOT NULL,
        "type" varchar(16) NOT NULL,
        "description" varchar(500),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_evidences_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_evidences_report_id" FOREIGN KEY ("reportId")
          REFERENCES "reports" ("id") ON DELETE CASCADE,
        CONSTRAINT "CK_evidences_type" CHECK ("type" IN ('IMAGE', 'FILE'))
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_evidences_report_id" ON "evidences" ("reportId")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_evidences_report_id"');
    await queryRunner.query('DROP TABLE "evidences"');
    await queryRunner.query('DROP TABLE "locations"');
  }
}

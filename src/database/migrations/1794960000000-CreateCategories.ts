import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategories1794960000000 implements MigrationInterface {
  name = 'CreateCategories1794960000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "slug" varchar(64) NOT NULL,
        "description" varchar(500),
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_categories_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "uq_categories_slug" ON "categories" ("slug")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "categories"');
  }
}

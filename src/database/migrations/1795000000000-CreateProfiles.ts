import { MigrationInterface, QueryRunner } from 'typeorm';

// down() elimina la tabla "profiles" y todos sus datos; probar la reversión
// solo sobre una base desechable.
export class CreateProfiles1795000000000 implements MigrationInterface {
  name = 'CreateProfiles1795000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "profiles" (
        "id" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "avatarUrl" varchar(2048),
        "bio" varchar(500),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_profiles_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_profiles_user_id" FOREIGN KEY ("userId")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "uq_profiles_user_id" ON "profiles" ("userId")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "profiles"');
  }
}

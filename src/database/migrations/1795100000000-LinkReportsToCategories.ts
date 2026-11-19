import { randomUUID } from 'node:crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

// Correspondencia fija entre la antigua columna "reports.category" y los
// slugs del catálogo. Se mantiene dentro de la migración, sin depender de
// CategoriesService, para que no cambie si el código evoluciona.
const LEGACY_CATEGORIES = [
  { legacy: 'ROADS', slug: 'vias', name: 'Vías' },
  { legacy: 'LIGHTING', slug: 'alumbrado-publico', name: 'Alumbrado público' },
  { legacy: 'WASTE', slug: 'residuos', name: 'Residuos' },
  { legacy: 'PUBLIC_SPACE', slug: 'espacio-publico', name: 'Espacio público' },
  { legacy: 'SECURITY', slug: 'seguridad', name: 'Seguridad' },
  { legacy: 'OTHER', slug: 'otros', name: 'Otros' },
] as const;

// Tabla temporal con la correspondencia, para usarla en UPDATE ... FROM
const MAPPING_SQL = `(VALUES ${LEGACY_CATEGORIES.map(
  ({ legacy, slug }) => `('${legacy}', '${slug}')`,
).join(', ')}) AS "m" ("legacy", "slug")`;

// Por defecto TypeORM ejecuta todas las migraciones en una transacción:
// cualquier error revierte también los pasos anteriores.
export class LinkReportsToCategories1795100000000 implements MigrationInterface {
  name = 'LinkReportsToCategories1795100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear solo las categorías de referencia que falten. Las existentes
    //    (aunque estén inactivas) se reutilizan sin modificarlas.
    for (const { slug, name } of LEGACY_CATEGORIES) {
      await queryRunner.query(
        `INSERT INTO "categories" ("id", "name", "slug", "description", "isActive")
         VALUES ($1, $2, $3, NULL, true)
         ON CONFLICT ("slug") DO NOTHING`,
        [randomUUID(), name, slug],
      );
    }

    const [{ total: before }] = (await queryRunner.query(
      'SELECT COUNT(*)::int AS "total" FROM "reports"',
    )) as { total: number }[];

    // 2. Columna nueva, temporalmente nullable, y traslado de datos
    await queryRunner.query(
      'ALTER TABLE "reports" ADD COLUMN "categoryId" uuid',
    );
    await queryRunner.query(`
      UPDATE "reports" AS "r"
      SET "categoryId" = "c"."id"
      FROM ${MAPPING_SQL}
      JOIN "categories" AS "c" ON "c"."slug" = "m"."slug"
      WHERE "r"."category" = "m"."legacy"
    `);

    // 3. Verificar antes de borrar nada: todos clasificados y mismo total
    const [{ total: after, missing }] = (await queryRunner.query(
      `SELECT COUNT(*)::int AS "total",
              COUNT(*) FILTER (WHERE "categoryId" IS NULL)::int AS "missing"
       FROM "reports"`,
    )) as { total: number; missing: number }[];
    if (missing > 0 || after !== before) {
      throw new Error(
        `LinkReportsToCategories: ${missing} reportes sin categoría ` +
          `(antes ${before}, después ${after}). Se aborta la migración.`,
      );
    }

    // 4. Restricciones finales
    await queryRunner.query(
      'ALTER TABLE "reports" ALTER COLUMN "categoryId" SET NOT NULL',
    );
    await queryRunner.query(`
      ALTER TABLE "reports" ADD CONSTRAINT "FK_reports_category_id"
        FOREIGN KEY ("categoryId") REFERENCES "categories" ("id")
        ON DELETE RESTRICT
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_reports_category_id" ON "reports" ("categoryId")',
    );

    // 5. Retirar la clasificación fija una vez validado el traslado
    await queryRunner.query(
      'ALTER TABLE "reports" DROP CONSTRAINT "CK_reports_category"',
    );
    await queryRunner.query('ALTER TABLE "reports" DROP COLUMN "category"');
  }

  // Reversión: solo es posible si TODOS los reportes usan una de las seis
  // categorías originales (por slug). Si alguno usa una categoría creada
  // después, se aborta: no se inventan equivalencias ni se convierte a OTHER.
  // En ese caso hay que restaurar el respaldo de la base.
  // Las categorías no se borran: pueden pertenecer al catálogo de Manuel.
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "reports" ADD COLUMN "category" varchar(32)',
    );
    await queryRunner.query(`
      UPDATE "reports" AS "r"
      SET "category" = "m"."legacy"
      FROM ${MAPPING_SQL}
      JOIN "categories" AS "c" ON "c"."slug" = "m"."slug"
      WHERE "r"."categoryId" = "c"."id"
    `);
    const [{ missing }] = (await queryRunner.query(
      `SELECT COUNT(*)::int AS "missing" FROM "reports"
       WHERE "category" IS NULL`,
    )) as { missing: number }[];
    if (missing > 0) {
      throw new Error(
        `No se puede revertir LinkReportsToCategories: ${missing} reportes ` +
          'usan categorías sin equivalente en la clasificación anterior. ' +
          'Restaura el respaldo de la base.',
      );
    }

    await queryRunner.query(
      'ALTER TABLE "reports" ALTER COLUMN "category" SET NOT NULL',
    );
    await queryRunner.query(`
      ALTER TABLE "reports" ADD CONSTRAINT "CK_reports_category" CHECK (
        "category" IN (${LEGACY_CATEGORIES.map(({ legacy }) => `'${legacy}'`).join(', ')})
      )
    `);
    await queryRunner.query('DROP INDEX "idx_reports_category_id"');
    await queryRunner.query(
      'ALTER TABLE "reports" DROP CONSTRAINT "FK_reports_category_id"',
    );
    await queryRunner.query('ALTER TABLE "reports" DROP COLUMN "categoryId"');
  }
}

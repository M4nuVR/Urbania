import dataSource from './data-source';

// Datos SOLO para desarrollo y demo de Persona 4 (no usar en producción).
// Ejecutar después de las migraciones:  npm run seed:dev
// Es idempotente: se puede ejecutar varias veces.
//
// passwordHash es un marcador: estos usuarios no pueden iniciar sesión con el
// login de Persona 1 hasta que haya hashes reales. Para probar ahora, usar
// DEV_AUTH=true y la cabecera x-user-id con estos UUID.
const SEED = `
  INSERT INTO "users" ("id", "name", "email", "passwordHash", "role") VALUES
    ('aaaaaaaa-0000-4000-8000-000000000001', 'Admin Urbania',       'admin@urbania.dev',     'dev-only', 'ADMIN'),
    ('aaaaaaaa-0000-4000-8000-000000000002', 'Autoridad Alumbrado', 'autoridad@urbania.dev', 'dev-only', 'AUTHORITY'),
    ('aaaaaaaa-0000-4000-8000-000000000003', 'Ciudadana Demo',      'ciudadano@urbania.dev', 'dev-only', 'CITIZEN')
  ON CONFLICT ("id") DO NOTHING;

  INSERT INTO "reports" ("id", "title", "description", "status", "citizenId") VALUES
    ('bbbbbbbb-0000-4000-8000-000000000001', 'Luminaria dañada',
     'La luminaria de la esquina está apagada desde hace una semana.',
     'REPORTED', 'aaaaaaaa-0000-4000-8000-000000000003')
  ON CONFLICT ("id") DO NOTHING;

  INSERT INTO "tracking" ("id", "reportId", "previousStatus", "newStatus", "changedBy") VALUES
    ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001',
     NULL, 'REPORTED', 'aaaaaaaa-0000-4000-8000-000000000003')
  ON CONFLICT ("id") DO NOTHING;
`;

async function main() {
  await dataSource.initialize();
  try {
    await dataSource.query(SEED);
    console.log('Datos de demo cargados');
  } finally {
    await dataSource.destroy();
  }
}

void main();

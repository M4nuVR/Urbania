import bcrypt from 'bcryptjs';
import dataSource from './data-source';

// Datos SOLO para desarrollo y demo (no usar en producción).
// Ejecutar después de las migraciones:  npm run seed:dev
// Es idempotente: se puede ejecutar varias veces.
//
// El registro publico solo crea ciudadanos; este seed crea ademas un ADMIN y
// una AUTHORITY para probar asignaciones. Todos usan la misma contraseña:
// SEED_PASSWORD o, si no se define, "urbania-demo".
const USERS = [
  ['aaaaaaaa-0000-4000-8000-000000000001', 'admin@urbania.dev', 'Admin Urbania', 'ADMIN'],
  ['aaaaaaaa-0000-4000-8000-000000000002', 'autoridad@urbania.dev', 'Autoridad Alumbrado', 'AUTHORITY'],
  ['aaaaaaaa-0000-4000-8000-000000000003', 'ciudadano@urbania.dev', 'Ciudadana Demo', 'CITIZEN'],
] as const;

async function main() {
  const passwordHash = await bcrypt.hash(
    process.env.SEED_PASSWORD ?? 'urbania-demo',
    10,
  );

  await dataSource.initialize();
  try {
    for (const [id, email, fullName, role] of USERS) {
      await dataSource.query(
        `INSERT INTO "users" ("id", "email", "fullName", "passwordHash", "role")
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ("id") DO NOTHING`,
        [id, email, fullName, passwordHash, role],
      );
    }
    await dataSource.query(
      `INSERT INTO "reports" ("id", "ownerId", "title", "description", "category", "status")
       VALUES ($1, $2, $3, $4, 'LIGHTING', 'REPORTED')
       ON CONFLICT ("id") DO NOTHING`,
      [
        'bbbbbbbb-0000-4000-8000-000000000001',
        USERS[2][0],
        'Luminaria dañada',
        'La luminaria de la esquina está apagada desde hace una semana.',
      ],
    );
    console.log('Datos de demo cargados');
  } finally {
    await dataSource.destroy();
  }
}

void main();

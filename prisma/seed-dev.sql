-- Datos SOLO para desarrollo y demo de Persona 4 (no usar en producción).
-- Ejecutar:  npx prisma db execute --file prisma/seed-dev.sql
-- Es idempotente: se puede ejecutar varias veces.
--
-- password_hash es un marcador: estos usuarios no pueden iniciar sesión con el
-- login de Persona 1 hasta que ella genere hashes reales. Para probar ahora, usar
-- DEV_AUTH=true y la cabecera x-user-id con estos UUID.

INSERT INTO users (id, name, email, password_hash, role, updated_at) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Admin Urbania',      'admin@urbania.dev',     'dev-only', 'ADMIN',     now()),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Autoridad Alumbrado', 'autoridad@urbania.dev', 'dev-only', 'AUTHORITY', now()),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'Ciudadana Demo',      'ciudadano@urbania.dev', 'dev-only', 'CITIZEN',   now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO reports (id, title, description, status, citizen_id, updated_at) VALUES
  ('bbbbbbbb-0000-4000-8000-000000000001', 'Luminaria dañada',
   'La luminaria de la esquina está apagada desde hace una semana.',
   'REPORTED', 'aaaaaaaa-0000-4000-8000-000000000003', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO tracking (id, report_id, previous_status, new_status, changed_by) VALUES
  ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001',
   NULL, 'REPORTED', 'aaaaaaaa-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

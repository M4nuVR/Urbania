# Persona 4 — Atención, seguimiento y notificaciones

Implementa `AssignmentsModule`, `TrackingModule` y `NotificationsModule` sobre Prisma + PostgreSQL.

## Estructura

```
src/
├── common/auth/            Contrato de autenticación (TEMPORAL hasta Persona 1)
│   ├── auth-user.ts          { id, role } del usuario autenticado
│   ├── auth.guard.ts         Respeta request.user; en desarrollo acepta x-user-id
│   ├── current-user.decorator.ts
│   ├── roles.decorator.ts
│   └── roles.guard.ts
├── notifications/          Notificaciones internas (sin correo ni SMS)
├── assignments/            Asignación de autoridad + ReportAccessService
└── tracking/               Cambio de estado transaccional e historial
    └── status-transitions.ts  Reglas de transición (función pura)
```

Dependencias sin ciclos: `Tracking → Assignments → Notifications`.

## Endpoints

| Método y ruta | Quién | Respuestas de error |
|---|---|---|
| `POST /reports/:id/assign` `{ authorityId }` | ADMIN | 404 reporte/usuario · 422 no es AUTHORITY · 409 resuelto o ya asignado |
| `GET /reports/:id/assignment` | ADMIN, ciudadano dueño, autoridad asignada | 404 sin asignación · 403 |
| `PATCH /reports/:id/status` `{ newStatus, observation? }` | ADMIN o autoridad asignada | 403 ciudadano/autoridad ajena · 409 salto, mismo estado, resuelto, sin asignación, concurrencia · 400 resolver sin observación |
| `GET /reports/:id/tracking` | ADMIN, ciudadano dueño, autoridad asignada | 404 · 403 |
| `GET /users/me/notifications?page&limit&unreadOnly` | Cualquier usuario autenticado | 401 |
| `PATCH /notifications/:id/read` | Destinatario | 404 si no existe o es ajena |

Swagger: `http://localhost:3000/docs`

## Reglas implementadas

| Actual | Siguiente | Regla |
|---|---|---|
| `REPORTED` | `UNDER_REVIEW` | Autoridad asignada o administrador |
| `UNDER_REVIEW` | `IN_PROGRESS` | Autoridad asignada o administrador; debe existir asignación |
| `IN_PROGRESS` | `RESOLVED` | Autoridad asignada o administrador; observación obligatoria |
| `RESOLVED` | — | Sin cambios |

Decisiones tomadas (revisar con el equipo):
- **Asignar no cambia el estado.** Después de asignar, el estado se mueve con `PATCH /status`.
- **Al asignar se notifica** a la autoridad y al ciudadano (`type: ASSIGNED`). Cada cambio de estado notifica al ciudadano dueño (`STATUS_CHANGED`).
- **Sin reasignación** en el MVP (`report_id` único). Dos asignaciones simultáneas → 409.
- **Concurrencia:** `updateMany` condicionado al estado leído; si no afecta filas → 409 y rollback.
- **Ubicación obligatoria antes de `IN_PROGRESS`:** pendiente. Cuando Persona 3 tenga `Location` en Prisma, se agrega en `status-transitions.ts`.

## Puesta en marcha con PostgreSQL

1. En `.env`: `DATABASE_URL` real y `DEV_AUTH=true` (ver `.env.example`).
2. `npm install`
3. `npm run prisma:migrate` — aplica `20261014000000_init`. Si Prisma propone una migración nueva, el schema y la migración no coinciden; revisar antes de subir.
4. Datos de demo: `npx prisma db execute --file prisma/seed-dev.sql`
5. `npm run start:dev` y abrir `http://localhost:3000/docs`

### Probar el flujo (con DEV_AUTH)

Usuarios del seed (cabecera `x-user-id`):

| Rol | UUID |
|---|---|
| ADMIN | `aaaaaaaa-0000-4000-8000-000000000001` |
| AUTHORITY | `aaaaaaaa-0000-4000-8000-000000000002` |
| CITIZEN | `aaaaaaaa-0000-4000-8000-000000000003` |

Reporte de demo: `bbbbbbbb-0000-4000-8000-000000000001`

```bash
R=bbbbbbbb-0000-4000-8000-000000000001
ADMIN=aaaaaaaa-0000-4000-8000-000000000001
AUTH=aaaaaaaa-0000-4000-8000-000000000002
CIT=aaaaaaaa-0000-4000-8000-000000000003
API=http://localhost:3000

curl -X POST  $API/reports/$R/assign -H "x-user-id: $ADMIN" -H "Content-Type: application/json" -d "{\"authorityId\":\"$AUTH\"}"
curl -X PATCH $API/reports/$R/status -H "x-user-id: $AUTH"  -H "Content-Type: application/json" -d '{"newStatus":"UNDER_REVIEW"}'
curl -X PATCH $API/reports/$R/status -H "x-user-id: $AUTH"  -H "Content-Type: application/json" -d '{"newStatus":"IN_PROGRESS"}'
curl -X PATCH $API/reports/$R/status -H "x-user-id: $AUTH"  -H "Content-Type: application/json" -d '{"newStatus":"RESOLVED","observation":"Luminaria reemplazada"}'
curl $API/reports/$R/tracking      -H "x-user-id: $CIT"
curl $API/users/me/notifications   -H "x-user-id: $CIT"
```

## Integración con el resto del equipo

**Persona 1 (usuarios y JWT)**
- Su guard JWT debe dejar `request.user = { id | sub, role }`. Con eso `AuthGuard` deja pasar sin más.
- Para integrar: reemplazar el cuerpo de `src/common/auth/auth.guard.ts` por la verificación JWT, o cambiar `AuthGuard` en los controladores por el guard que exporte Persona 1. Después, eliminar `DEV_AUTH`.
- Si definen `GET /users/:id` con `ParseUUIDPipe`, comprobar que `/users/me/notifications` siga resolviendo a este módulo.

**Persona 2 (reportes)**
- No exponer otra ruta que cambie `status` (ni aceptar `status` en el DTO de actualización).
- Entrada inicial del historial: importar `TrackingModule` y, dentro de la transacción que crea el reporte:
  ```ts
  await this.prisma.$transaction(async (tx) => {
    const report = await tx.report.create({ data: { ...dto, citizenId } });
    await this.tracking.recordInitial(tx, report.id, citizenId);
    return report;
  });
  ```
- Agregar campos a `Report` con una **migración nueva**, sin recrear `init`.

**Persona 3 (ubicación y evidencias)**
- Para la regla de ubicación obligatoria, `Location` debe existir en `schema.prisma`.

## Pruebas

```bash
npm test          # reglas de transición, asignación, cambio de estado, notificaciones
npm run test:e2e  # guards y validación HTTP (PrismaService simulado, no necesita BD)
```

# Persona 4 — Atención, seguimiento y notificaciones

Implementa `AssignmentsModule`, `TrackingModule` y `NotificationsModule` con TypeORM + PostgreSQL.

## Estructura

```
src/
├── common/auth/
│   ├── roles.ts            @Roles() y hasRole()
│   └── roles.guard.ts      Exige rol; corre después del AuthGuard JWT global (Persona 1)
├── assignments/            Asignación de autoridad + ReportAccessService
├── tracking/               Cambio de estado transaccional e historial
│   └── status-transitions.ts  Reglas de transición (función pura)
├── notifications/          Notificaciones internas (sin correo ni SMS)
└── database/
    ├── migrations/1761000000000-AddAssignmentsTrackingNotifications.ts
    └── seed-dev.ts         Usuarios ADMIN / AUTHORITY / CITIZEN de demo
```

Dependencias sin ciclos: `Tracking → Assignments → Notifications`.

## Endpoints

Todos requieren `Authorization: Bearer <token>` (login de Persona 1).

| Método y ruta | Quién | Respuestas de error |
|---|---|---|
| `POST /reports/:id/assign` `{ authorityId }` | ADMIN | 404 reporte/usuario · 422 no es AUTHORITY · 409 final o ya asignado |
| `GET /reports/:id/assignment` | ADMIN, dueño, autoridad asignada | 404 sin asignación · 403 |
| `PATCH /reports/:id/status` `{ newStatus, observation? }` | ADMIN o autoridad asignada | 403 · 409 transición inválida, sin asignación, concurrencia · 400 sin observación |
| `GET /reports/:id/tracking` | ADMIN, dueño, autoridad asignada | 404 · 403 |
| `GET /users/me/notifications?page&limit&unreadOnly` | Cualquier usuario autenticado | 401 |
| `PATCH /notifications/:id/read` | Destinatario | 404 si no existe o es ajena |

`PATCH /reports/:id/status` es la **única** ruta que cambia el estado (antes estaba en `ReportsService`).

## Reglas de estado

Se usan los estados de Persona 2.

| Actual | Siguiente | Regla |
|---|---|---|
| `REPORTED` | `IN_PROGRESS` | Debe existir asignación |
| `REPORTED` | `REJECTED` | Observación obligatoria |
| `IN_PROGRESS` | `RESOLVED` | Observación obligatoria |
| `IN_PROGRESS` | `REJECTED` | Observación obligatoria |
| `RESOLVED`, `REJECTED` | — | Finales |

Siempre: solo ADMIN o la autoridad asignada; el ciudadano nunca.

Decisiones (revisar con el equipo):
- **Nuevo rol `AUTHORITY`** en `UserRole` (la migración actualiza `CK_users_role`). El registro público sigue creando solo ciudadanos; los ADMIN y AUTHORITY se crean con el seed o actualizando el rol en la base.
- **Asignar no cambia el estado.** Notifica a la autoridad y al dueño (`ASSIGNED`); cada cambio de estado notifica al dueño (`STATUS_CHANGED`).
- **Sin reasignación** en el MVP (`reportId` único). Dos asignaciones simultáneas → 409.
- **Concurrencia:** `UPDATE ... WHERE status = <leído>`; si no afecta filas → 409 y rollback.

## Puesta en marcha

```powershell
$env:DATABASE_URL = 'postgresql://usuario:clave@localhost:5432/urbania'
$env:JWT_SECRET = 'un-secreto-largo'
npm install
npm run migration:run
npm run seed:dev        # admin@, autoridad@, ciudadano@urbania.dev — contraseña: urbania-demo
npm run start:dev       # http://localhost:3000/docs
```

### Probar el flujo

```bash
API=http://localhost:3000
R=bbbbbbbb-0000-4000-8000-000000000001        # reporte del seed
AUTH_ID=aaaaaaaa-0000-4000-8000-000000000002  # autoridad del seed
login() { curl -s $API/auth/login -H "Content-Type: application/json" \
  -d "{\"email\":\"$1\",\"password\":\"urbania-demo\"}" | sed 's/.*"accessToken":"\([^"]*\)".*/\1/'; }
ADMIN=$(login admin@urbania.dev); AUTH=$(login autoridad@urbania.dev); CIT=$(login ciudadano@urbania.dev)

curl -X POST  $API/reports/$R/assign -H "Authorization: Bearer $ADMIN" -H "Content-Type: application/json" -d "{\"authorityId\":\"$AUTH_ID\"}"
curl -X PATCH $API/reports/$R/status -H "Authorization: Bearer $AUTH"  -H "Content-Type: application/json" -d '{"newStatus":"IN_PROGRESS"}'
curl -X PATCH $API/reports/$R/status -H "Authorization: Bearer $AUTH"  -H "Content-Type: application/json" -d '{"newStatus":"RESOLVED","observation":"Luminaria reemplazada"}'
curl $API/reports/$R/tracking    -H "Authorization: Bearer $CIT"
curl $API/users/me/notifications -H "Authorization: Bearer $CIT"
```

## Pendientes con el resto del equipo

**Persona 2 (reportes)**
- Se quitó `updateStatus` de `ReportsService` y la ruta `PATCH /reports/:id/status` de su controlador: ahora vive en `TrackingModule`.
- Opcional: registrar la entrada inicial del historial al crear un reporte con `trackingService.recordInitial(manager, report.id, ownerId)` dentro de una transacción.
- La autoridad asignada aún no puede ver `GET /reports/:id`, ni la ubicación o evidencias, porque `findOne` y `ReportAccessAdapter.canRead` solo permiten dueño o ADMIN. Habría que permitir también a la autoridad asignada (`Assignment.authorityId`).

**Persona 3 (ubicación)**
- Regla opcional "ubicación obligatoria antes de `IN_PROGRESS`": se agrega en `status-transitions.ts` cuando el equipo lo decida.

## Pruebas

```bash
npm test          # reglas de transición, asignación, cambio de estado, notificaciones
npm run test:e2e  # flujo completo con JWT real sobre sql.js en memoria
```

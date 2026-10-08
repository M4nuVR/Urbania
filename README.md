# Urbania API

API NestJS para reportes urbanos. Esta rama `Khaled` incorpora ubicacion unica por reporte y evidencias mediante URL.

## Rama de trabajo

```bash
git checkout -b Khaled
```

En este workspace la rama `Khaled` ya existia, por eso el trabajo quedo aplicado sobre esa rama.

## Configuracion PostgreSQL

Define `DATABASE_URL` con la conexion PostgreSQL y ejecuta la migracion antes de iniciar:

```powershell
$env:DATABASE_URL = 'postgresql://usuario:clave@localhost:5432/urbania'
npm run migration:run
npm run start:dev
```

La API documentada queda disponible en `/docs`. `synchronize` permanece desactivado en PostgreSQL.

## Contratos de identidad y reportes

Persona 1 debe instalar su guard de autenticacion global y dejar el usuario validado en `request.user.id` o `request.user.sub`, junto con `role` o `roles`. Los controladores fallan con `401` si no hay usuario autenticado.

Persona 2 debe registrar el proveedor `REPORT_ACCESS_PORT` (`src/common/report-access.ts`). Su implementacion debe exponer:

- `findById(reportId)` con `id`, `ownerId` y `status`.
- `canRead(principal, report)` para validar consultas.
- `canModify(principal, report)` para validar cambios.

Las modificaciones exigen propietario y estado `REPORTED`. Mientras el proveedor no este registrado, las operaciones responden `503`.

## Endpoints

```http
POST   /reports/{id}/location
GET    /reports/{id}/location
PATCH  /reports/{id}/location
POST   /reports/{id}/evidences
GET    /reports/{id}/evidences
DELETE /evidences/{id}
```

## Ubicacion

```json
{
  "address": "Calle 10 # 5-20",
  "neighborhood": "Centro",
  "zone": "Zona norte",
  "latitude": 4.711,
  "longitude": -74.0721
}
```

Reglas principales:

- Solo una ubicacion por reporte (`reportId` unico).
- `reportId` siempre se toma de la ruta.
- Latitud entre `-90` y `90`; longitud entre `-180` y `180`.
- Latitud y longitud deben enviarse juntas.
- Se exige `address` o `neighborhood`.
- Crear o actualizar solo esta permitido si el reporte esta en `REPORTED`.

## Evidencias

```json
{
  "url": "https://files.example.org/evidence/photo.jpg",
  "type": "IMAGE",
  "description": "Bache junto a la interseccion"
}
```

El MVP guarda solo URLs. HTTPS esta permitido siempre; HTTP solo en ambientes no productivos. Eliminar una evidencia borra unicamente el registro en base de datos, no el archivo remoto.

## Project setup

```bash
npm install
```

## Compile and run

```bash
npm run start
npm run start:dev
npm run start:prod
```

## Run tests

```bash
npm run test
npm run test:e2e
npm run test:cov
```

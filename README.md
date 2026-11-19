# Urbania API

API NestJS para reportes urbanos: los ciudadanos registran reportes con ubicacion y evidencias, y los administradores gestionan su estado.

## Configuracion

Copia `.env.example` y define al menos `DATABASE_URL` y `JWT_SECRET`. Luego ejecuta las migraciones antes de iniciar:

```powershell
$env:DATABASE_URL = 'postgresql://usuario:clave@localhost:5432/urbania'
$env:JWT_SECRET = 'un-secreto-largo'
npm run migration:run
npm run start:dev
```

La API documentada queda disponible en `/docs`. `synchronize` permanece desactivado en PostgreSQL.

## Autenticacion

Todas las rutas exigen `Authorization: Bearer <token>`, salvo `GET /`, `POST /auth/register` y `POST /auth/login`.

```http
POST /auth/register   { "email", "fullName", "password" }
POST /auth/login      { "email", "password" }
GET  /auth/me
```

Los usuarios nuevos son `CITIZEN`. Para crear un `ADMIN`, actualiza la columna `role` en la tabla `users`.

## Reportes

```http
POST  /reports
GET   /reports?status=&categoryId=
GET   /reports/{id}
PATCH /reports/{id}
PATCH /reports/{id}/status   (solo ADMIN)
```

```json
{
  "title": "Bache en la calle 10",
  "description": "Hay un bache profundo frente al parque",
  "categoryId": "<UUID de GET /categories>"
}
```

- `categoryId` es el UUID de una categoría **activa** del catálogo (`GET /categories`). Una categoría inexistente devuelve `404`; una desactivada, `400`.
- Si una categoría se desactiva, los reportes que ya la tienen la conservan y siguen apareciendo en consultas y filtros, pero no se puede asignar a reportes nuevos ni como cambio de categoría.
- `PATCH /reports/{id}` admite `categoryId` (no acepta `null`). Las respuestas incluyen el objeto `category`.
- Migración `1795100000000-LinkReportsToCategories`: crea las categorías de referencia que falten (`vias`, `alumbrado-publico`, `residuos`, `espacio-publico`, `seguridad`, `otros`), reutiliza las que ya existan sin modificarlas y traslada cada reporte desde la antigua columna `category` (`ROADS`, `LIGHTING`, `WASTE`, `PUBLIC_SPACE`, `SECURITY`, `OTHER`). Si algún reporte queda sin categoría, la migración aborta sin cambios. Su reversión solo funciona si todos los reportes usan esas seis categorías; si no, aborta y hay que restaurar el respaldo.
- Un ciudadano solo ve y edita sus reportes; un `ADMIN` ve todos.
- Solo se edita mientras el estado sea `REPORTED`.
- Transiciones de estado: `REPORTED -> IN_PROGRESS | REJECTED`, `IN_PROGRESS -> RESOLVED | REJECTED`.

El modulo de reportes registra `REPORT_ACCESS_PORT` (`src/common/report-access.ts`), que usan ubicaciones y evidencias para autorizar: el propietario y `ADMIN` pueden consultar; solo el propietario modifica, y solo en `REPORTED`.

## Ubicacion y evidencias

```http
POST   /reports/{id}/location
GET    /reports/{id}/location
PATCH  /reports/{id}/location
POST   /reports/{id}/evidences
GET    /reports/{id}/evidences
DELETE /evidences/{id}
```

### Ubicacion

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

### Evidencias

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

# Conexión a PostgreSQL con Prisma

Urbania usa **Prisma 7.10** con PostgreSQL. Prisma 7 se conecta mediante un *driver adapter* (`@prisma/adapter-pg`) y genera el cliente dentro de `src/generated/prisma` (ignorado por git; se regenera solo).

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `prisma/schema.prisma` | Esquema común de todo el equipo (un solo archivo) |
| `prisma/migrations/` | Migraciones SQL versionadas en git |
| `prisma.config.ts` | Configuración del CLI de Prisma: ruta del esquema, migraciones y `DATABASE_URL` |
| `src/prisma/prisma.service.ts` | `PrismaService`: cliente inyectable; verifica la conexión al arrancar |
| `src/prisma/prisma.module.ts` | `PrismaModule` global: cualquier módulo puede inyectar `PrismaService` |
| `.env.example` | Plantilla de variables; copiar a `.env` |

## Puesta en marcha (cada integrante)

1. Tener PostgreSQL disponible:
   - **Local:** instalar PostgreSQL 16+ y crear la base `urbania` (`CREATE DATABASE urbania;`).
   - **Nube:** crear una base en Neon u otro proveedor y copiar su cadena de conexión (con `sslmode=require`).
2. Copiar `.env.example` a `.env` y poner la `DATABASE_URL` real. **No subir `.env` a git.**
3. Instalar dependencias (también genera el cliente de Prisma):
   ```bash
   npm install
   ```
4. Aplicar las migraciones existentes:
   ```bash
   npm run prisma:migrate
   ```
5. Levantar la API:
   ```bash
   npm run start:dev
   ```
   Si PostgreSQL no responde, la app se detiene al arrancar con un error de Prisma en lugar de fallar en la primera petición.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run prisma:generate` | Regenera el cliente después de cambiar el esquema |
| `npm run prisma:migrate -- --name <nombre>` | Crea y aplica una migración nueva (desarrollo) |
| `npm run prisma:deploy` | Aplica migraciones pendientes sin crear nuevas (producción / CI) |
| `npm run prisma:studio` | Abre un explorador visual de la base |

## Uso en un servicio

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  findMine(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

Los tipos y enums se importan del cliente generado:

```ts
import { ReportStatus, Role } from '../generated/prisma/enums.js';
```

### Transacciones (cambio de estado)

```ts
await this.prisma.$transaction(async (tx) => {
  const { count } = await tx.report.updateMany({
    where: { id: reportId, status: expectedStatus },
    data: { status: newStatus },
  });
  if (count === 0) throw new ConflictException('El estado del reporte cambió');

  await tx.tracking.create({ data: { reportId, previousStatus: expectedStatus, newStatus, changedBy, observation } });
  await tx.notification.create({ data: { userId: citizenId, reportId, type: 'STATUS_CHANGED', message } });
});
```

Si cualquier operación falla, Prisma revierte todo el bloque.

## Reglas del equipo para el esquema

- Un solo `schema.prisma`; cada persona edita solo sus modelos (están separados por comentarios).
- Después de cambiar el esquema: `npm run prisma:migrate -- --name <descripcion>` y subir la carpeta de migración creada.
- Nunca editar una migración que ya está en `main`; crear una nueva.
- Si dos ramas crean migraciones a la vez, quien integra después hace `git pull`, borra su migración local sin publicar y la vuelve a generar.
- IDs `UUID`, fechas `timestamptz`, nombres de tablas y columnas en `snake_case` (`@@map` / `@map`).

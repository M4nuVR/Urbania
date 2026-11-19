import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Report, ReportStatus } from '../src/reports/report.entity';
import { User, UserRole } from '../src/users/user.entity';

describe('Reports ↔ Categories (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let anaToken: string;
  let betoToken: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const server = () => request(app.getHttpServer());

  async function register(email: string): Promise<string> {
    const response = await server()
      .post('/auth/register')
      .send({ email, fullName: 'Pruebas', password: 'contrasena-segura' })
      .expect(201);
    return response.body.accessToken as string;
  }

  async function createCategory(isActive = true): Promise<string> {
    const response = await server()
      .post('/categories')
      .set(auth(adminToken))
      .send({ name: 'Categoría', slug: `cat-${randomUUID()}`, isActive })
      .expect(201);
    return response.body.id as string;
  }

  function createReport(token: string, categoryId: unknown) {
    return server().post('/reports').set(auth(token)).send({
      title: 'Bache en la calle 10',
      description: 'Hay un bache profundo frente al parque',
      categoryId,
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    await register('rc-admin@example.org');
    await app
      .get<Repository<User>>(getRepositoryToken(User))
      .update({ email: 'rc-admin@example.org' }, { role: UserRole.ADMIN });
    adminToken = (
      await server()
        .post('/auth/login')
        .send({ email: 'rc-admin@example.org', password: 'contrasena-segura' })
        .expect(200)
    ).body.accessToken as string;
    anaToken = await register('rc-ana@example.org');
    betoToken = await register('rc-beto@example.org');
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('creates a report with an active category and returns it', async () => {
    const categoryId = await createCategory();
    const response = await createReport(anaToken, categoryId).expect(201);
    expect(response.body).toMatchObject({
      categoryId,
      category: { id: categoryId, isActive: true },
    });
    expect(response.body.category.passwordHash).toBeUndefined();
  });

  it('rejects missing, inactive, malformed and null categories', async () => {
    await createReport(anaToken, randomUUID()).expect(404);
    await createReport(anaToken, await createCategory(false)).expect(400);
    await createReport(anaToken, 'no-es-uuid').expect(400);
    await createReport(anaToken, null).expect(400);
    await createReport(anaToken, undefined).expect(400);
    // El contrato anterior ya no se acepta
    await server()
      .post('/reports')
      .set(auth(anaToken))
      .send({
        title: 'Bache en la calle 10',
        description: 'Hay un bache profundo frente al parque',
        category: 'ROADS',
      })
      .expect(400);
  });

  it('changes the category of an own REPORTED report and validates the new one', async () => {
    const first = await createCategory();
    const second = await createCategory();
    const id = (await createReport(anaToken, first).expect(201)).body
      .id as string;
    const patch = (token: string, body: object) =>
      server().patch(`/reports/${id}`).set(auth(token)).send(body);

    const changed = await patch(anaToken, { categoryId: second }).expect(200);
    expect(changed.body).toMatchObject({
      categoryId: second,
      category: { id: second },
    });
    const detail = await server()
      .get(`/reports/${id}`)
      .set(auth(anaToken))
      .expect(200);
    expect(detail.body.category.id).toBe(second);

    await patch(anaToken, { categoryId: null }).expect(400);
    await patch(anaToken, { categoryId: 'no-es-uuid' }).expect(400);
    await patch(anaToken, { categoryId: randomUUID() }).expect(404);
    await patch(anaToken, {
      categoryId: await createCategory(false),
    }).expect(400);
    await patch(betoToken, { categoryId: first }).expect(403);

    await app
      .get<Repository<Report>>(getRepositoryToken(Report))
      .update({ id }, { status: ReportStatus.IN_PROGRESS });
    await patch(anaToken, { categoryId: first }).expect(409);
  });

  it('filters by category and status without leaking other citizens reports', async () => {
    const categoryId = await createCategory();
    const other = await createCategory();
    const anaReport = (await createReport(anaToken, categoryId).expect(201))
      .body.id as string;
    await createReport(anaToken, other).expect(201);
    await createReport(betoToken, categoryId).expect(201);

    const list = (token: string, query: string) =>
      server().get(`/reports?${query}`).set(auth(token)).expect(200);

    const mine = await list(anaToken, `categoryId=${categoryId}`);
    expect(mine.body.map((r: Report) => r.id)).toEqual([anaReport]);
    expect(mine.body[0].category.id).toBe(categoryId);

    const filtered = await list(
      anaToken,
      `categoryId=${categoryId}&status=${ReportStatus.REPORTED}`,
    );
    expect(filtered.body).toHaveLength(1);

    const all = await list(adminToken, `categoryId=${categoryId}`);
    expect(all.body).toHaveLength(2);

    await list(anaToken, `categoryId=${randomUUID()}`).then((r) =>
      expect(r.body).toEqual([]),
    );
    await server()
      .get('/reports?categoryId=no-es-uuid')
      .set(auth(anaToken))
      .expect(400);
  });

  it('keeps history when a category is deactivated and blocks new assignments', async () => {
    const categoryId = await createCategory();
    const id = (await createReport(anaToken, categoryId).expect(201)).body
      .id as string;

    await server()
      .delete(`/categories/${categoryId}`)
      .set(auth(adminToken))
      .expect(200);

    const detail = await server()
      .get(`/reports/${id}`)
      .set(auth(anaToken))
      .expect(200);
    expect(detail.body.category).toMatchObject({
      id: categoryId,
      isActive: false,
    });
    const filtered = await server()
      .get(`/reports?categoryId=${categoryId}`)
      .set(auth(anaToken))
      .expect(200);
    expect(filtered.body).toHaveLength(1);

    // Editar otro campo (o reenviar la misma categoría) sigue funcionando
    const edited = await server()
      .patch(`/reports/${id}`)
      .set(auth(anaToken))
      .send({ title: 'Bache más grande', categoryId })
      .expect(200);
    expect(edited.body).toMatchObject({
      title: 'Bache más grande',
      categoryId,
    });

    await createReport(betoToken, categoryId).expect(400);
  });
});

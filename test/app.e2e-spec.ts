import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { Report, ReportStatus } from './../src/reports/report.entity';
import { Role, User } from './../src/users/user.entity';

// NODE_ENV=test (lo pone Jest) → AppModule usa sql.js en memoria.
const ADMIN = 'aaaaaaaa-0000-4000-8000-000000000001';
const AUTHORITY = 'aaaaaaaa-0000-4000-8000-000000000002';
const CITIZEN = 'aaaaaaaa-0000-4000-8000-000000000003';
const OTHER_AUTHORITY = 'aaaaaaaa-0000-4000-8000-000000000004';
const REPORT = 'bbbbbbbb-0000-4000-8000-000000000001';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.DEV_AUTH = 'true';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const dataSource = app.get(DataSource);
    const user = (id: string, role: Role) => ({
      id,
      role,
      name: role,
      email: `${id}@urbania.dev`,
      passwordHash: 'test',
    });
    await dataSource
      .getRepository(User)
      .save([
        user(ADMIN, Role.ADMIN),
        user(AUTHORITY, Role.AUTHORITY),
        user(CITIZEN, Role.CITIZEN),
        user(OTHER_AUTHORITY, Role.AUTHORITY),
      ]);
    await dataSource.getRepository(Report).save({
      id: REPORT,
      title: 'Luminaria dañada',
      description: 'Apagada desde hace una semana',
      citizenId: CITIZEN,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  const as = (userId: string) => ({
    get: (url: string) =>
      request(app.getHttpServer()).get(url).set('x-user-id', userId),
    post: (url: string) =>
      request(app.getHttpServer()).post(url).set('x-user-id', userId),
    patch: (url: string) =>
      request(app.getHttpServer()).patch(url).set('x-user-id', userId),
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('exige autenticación en las rutas de atención', () => {
    return request(app.getHttpServer())
      .get('/users/me/notifications')
      .expect(401);
  });

  it('impide que un ciudadano asigne o cambie el estado', async () => {
    await as(CITIZEN)
      .post(`/reports/${REPORT}/assign`)
      .send({ authorityId: AUTHORITY })
      .expect(403);
    await as(CITIZEN)
      .patch(`/reports/${REPORT}/status`)
      .send({ newStatus: 'UNDER_REVIEW' })
      .expect(403);
  });

  it('rechaza un estado inválido y campos no permitidos', async () => {
    await as(ADMIN)
      .patch(`/reports/${REPORT}/status`)
      .send({ newStatus: 'CERRADO' })
      .expect(400);
    await as(ADMIN)
      .patch(`/reports/${REPORT}/status`)
      .send({ newStatus: 'UNDER_REVIEW', changedBy: ADMIN })
      .expect(400);
  });

  it('recorre el flujo completo: asignar, atender, resolver y notificar', async () => {
    const assigned = await as(ADMIN)
      .post(`/reports/${REPORT}/assign`)
      .send({ authorityId: AUTHORITY })
      .expect(201);
    expect(assigned.body).toMatchObject({
      reportId: REPORT,
      authorityId: AUTHORITY,
      assignedBy: ADMIN,
      authority: { id: AUTHORITY },
    });
    expect(assigned.body.authority.passwordHash).toBeUndefined();

    await as(ADMIN)
      .post(`/reports/${REPORT}/assign`)
      .send({ authorityId: AUTHORITY })
      .expect(409);

    await as(OTHER_AUTHORITY)
      .patch(`/reports/${REPORT}/status`)
      .send({ newStatus: 'UNDER_REVIEW' })
      .expect(403);
    await as(AUTHORITY)
      .patch(`/reports/${REPORT}/status`)
      .send({ newStatus: 'IN_PROGRESS' })
      .expect(409);

    for (const newStatus of ['UNDER_REVIEW', 'IN_PROGRESS']) {
      await as(AUTHORITY)
        .patch(`/reports/${REPORT}/status`)
        .send({ newStatus })
        .expect(200);
    }
    await as(AUTHORITY)
      .patch(`/reports/${REPORT}/status`)
      .send({ newStatus: 'RESOLVED' })
      .expect(400);
    await as(AUTHORITY)
      .patch(`/reports/${REPORT}/status`)
      .send({ newStatus: 'RESOLVED', observation: 'Luminaria reemplazada' })
      .expect(200);

    const report = await app
      .get(DataSource)
      .getRepository(Report)
      .findOneByOrFail({ id: REPORT });
    expect(report.status).toBe(ReportStatus.RESOLVED);

    const tracking = await as(CITIZEN)
      .get(`/reports/${REPORT}/tracking`)
      .expect(200);
    expect(tracking.body.map((t: { newStatus: string }) => t.newStatus)).toEqual(
      ['UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED'],
    );
    await as(OTHER_AUTHORITY).get(`/reports/${REPORT}/tracking`).expect(403);

    const notifications = await as(CITIZEN)
      .get('/users/me/notifications')
      .expect(200);
    // 1 por asignación + 3 cambios de estado
    expect(notifications.body.meta).toMatchObject({ total: 4, unread: 4 });

    const first = notifications.body.data[0].id;
    await as(AUTHORITY).patch(`/notifications/${first}/read`).expect(404);
    await as(CITIZEN).patch(`/notifications/${first}/read`).expect(200);
    const unread = await as(CITIZEN)
      .get('/users/me/notifications?unreadOnly=true')
      .expect(200);
    expect(unread.body.meta).toMatchObject({ total: 3, unread: 3 });
  });
});

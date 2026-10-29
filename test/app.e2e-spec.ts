import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from './../src/app.module';
import { User, UserRole } from './../src/users/user.entity';

describe('Urbania API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
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
  });

  afterAll(async () => {
    await app.close();
  });

  async function register(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, fullName: 'Ana Perez', password: 'contrasena-segura' })
      .expect(201);
    return response.body.accessToken as string;
  }

  async function createReport(token: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Bache en la calle 10',
        description: 'Hay un bache profundo frente al parque',
        category: 'ROADS',
      })
      .expect(201);
    return response.body.id as string;
  }

  it('keeps / public', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('rejects protected routes without a token', () => {
    return request(app.getHttpServer()).get('/reports').expect(401);
  });

  it('registers, logs in and returns the current user', async () => {
    await register('login@example.org');

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'LOGIN@example.org', password: 'contrasena-segura' })
      .expect(200);

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(me.body).toMatchObject({
      email: 'login@example.org',
      role: 'CITIZEN',
    });
    expect(me.body.passwordHash).toBeUndefined();

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'login@example.org', password: 'incorrecta' })
      .expect(401);
  });

  it('rejects a duplicated email', async () => {
    await register('dup@example.org');
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'dup@example.org',
        fullName: 'Otra Persona',
        password: 'contrasena-segura',
      })
      .expect(409);
  });

  it('lets the owner add a location and evidence to a report', async () => {
    const token = await register('owner@example.org');
    const reportId = await createReport(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app.getHttpServer())
      .post(`/reports/${reportId}/location`)
      .set(auth)
      .send({ address: 'Calle 10 # 5-20', latitude: 4.711, longitude: -74.07 })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/reports/${reportId}/evidences`)
      .set(auth)
      .send({ url: 'https://files.example.org/photo.jpg', type: 'IMAGE' })
      .expect(201);

    const evidences = await request(app.getHttpServer())
      .get(`/reports/${reportId}/evidences`)
      .set(auth)
      .expect(200);
    expect(evidences.body).toHaveLength(1);
  });

  it('hides reports from other citizens', async () => {
    const ownerToken = await register('private-owner@example.org');
    const otherToken = await register('curious@example.org');
    const reportId = await createReport(ownerToken);

    await request(app.getHttpServer())
      .get(`/reports/${reportId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/reports/${reportId}/location`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ neighborhood: 'Centro' })
      .expect(403);

    const list = await request(app.getHttpServer())
      .get('/reports')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);
    expect(list.body).toHaveLength(0);
  });

  // Registra un usuario, le asigna el rol en la base y devuelve un token nuevo
  async function registerAs(email: string, role: UserRole): Promise<string> {
    await register(email);
    await app
      .get<Repository<User>>(getRepositoryToken(User))
      .update({ email }, { role });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'contrasena-segura' })
      .expect(200);
    return login.body.accessToken as string;
  }

  function api(token: string) {
    const server = app.getHttpServer();
    const auth = `Bearer ${token}`;
    return {
      get: (url: string) => request(server).get(url).set('Authorization', auth),
      post: (url: string) =>
        request(server).post(url).set('Authorization', auth),
      patch: (url: string) =>
        request(server).patch(url).set('Authorization', auth),
    };
  }

  it('lets an admin move the status and then blocks owner edits', async () => {
    const ownerToken = await register('status-owner@example.org');
    const adminToken = await registerAs('admin@example.org', UserRole.ADMIN);
    const reportId = await createReport(ownerToken);

    await api(ownerToken)
      .patch(`/reports/${reportId}/status`)
      .send({ newStatus: 'REJECTED', observation: 'Duplicado' })
      .expect(403);
    await api(adminToken)
      .patch(`/reports/${reportId}/status`)
      .send({ newStatus: 'REJECTED', observation: 'Duplicado' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/reports/${reportId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Nuevo titulo' })
      .expect(409);
    await request(app.getHttpServer())
      .post(`/reports/${reportId}/location`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ neighborhood: 'Centro' })
      .expect(409);
  });

  it('assigns an authority, tracks every status change and notifies', async () => {
    const citizen = api(await register('flow-owner@example.org'));
    const admin = api(await registerAs('flow-admin@example.org', UserRole.ADMIN));
    const authorityToken = await registerAs(
      'flow-authority@example.org',
      UserRole.AUTHORITY,
    );
    const authority = api(authorityToken);
    const outsider = api(
      await registerAs('flow-other@example.org', UserRole.AUTHORITY),
    );
    const authorityId = (await authority.get('/auth/me').expect(200)).body
      .id as string;
    const reportId = (
      await citizen
        .post('/reports')
        .send({
          title: 'Luminaria dañada',
          description: 'Apagada desde hace una semana',
          category: 'LIGHTING',
        })
        .expect(201)
    ).body.id as string;
    const status = (client: ReturnType<typeof api>, body: object) =>
      client.patch(`/reports/${reportId}/status`).send(body);

    await citizen
      .post(`/reports/${reportId}/assign`)
      .send({ authorityId })
      .expect(403);
    await status(admin, { newStatus: 'IN_PROGRESS' }).expect(409);

    const assigned = await admin
      .post(`/reports/${reportId}/assign`)
      .send({ authorityId })
      .expect(201);
    expect(assigned.body).toMatchObject({
      reportId,
      authorityId,
      authority: { id: authorityId, role: 'AUTHORITY' },
    });
    expect(assigned.body.authority.passwordHash).toBeUndefined();
    await admin
      .post(`/reports/${reportId}/assign`)
      .send({ authorityId })
      .expect(409);

    await status(outsider, { newStatus: 'IN_PROGRESS' }).expect(403);
    await status(authority, { newStatus: 'IN_PROGRESS' }).expect(200);
    await status(authority, { newStatus: 'RESOLVED' }).expect(400);
    await status(authority, {
      newStatus: 'RESOLVED',
      observation: 'Luminaria reemplazada',
    }).expect(200);
    await status(authority, { newStatus: 'REJECTED', observation: 'x' }).expect(
      409,
    );

    const report = await citizen.get(`/reports/${reportId}`).expect(200);
    expect(report.body.status).toBe('RESOLVED');

    const tracking = await citizen
      .get(`/reports/${reportId}/tracking`)
      .expect(200);
    expect(
      tracking.body.map((entry: { newStatus: string }) => entry.newStatus),
    ).toEqual(['IN_PROGRESS', 'RESOLVED']);
    expect(tracking.body[0].user).toMatchObject({ id: authorityId });
    await outsider.get(`/reports/${reportId}/tracking`).expect(403);
    await authority.get(`/reports/${reportId}/assignment`).expect(200);

    // 1 por la asignación + 2 cambios de estado
    const inbox = await citizen.get('/users/me/notifications').expect(200);
    expect(inbox.body.meta).toMatchObject({ total: 3, unread: 3 });
    const first = inbox.body.data[0].id as string;
    await authority.patch(`/notifications/${first}/read`).expect(404);
    await citizen.patch(`/notifications/${first}/read`).expect(200);
    const unread = await citizen
      .get('/users/me/notifications?unreadOnly=true')
      .expect(200);
    expect(unread.body.meta).toMatchObject({ total: 2, unread: 2 });

    const authorityInbox = await authority
      .get('/users/me/notifications')
      .expect(200);
    expect(authorityInbox.body.data[0].type).toBe('ASSIGNED');
  });

  it('requires a token for the attention routes', () => {
    return request(app.getHttpServer())
      .get('/users/me/notifications')
      .expect(401);
  });
});

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

  it('lets an admin move the status and then blocks owner edits', async () => {
    const ownerToken = await register('status-owner@example.org');
    await register('admin@example.org');
    await app
      .get<Repository<User>>(getRepositoryToken(User))
      .update({ email: 'admin@example.org' }, { role: UserRole.ADMIN });
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.org', password: 'contrasena-segura' })
      .expect(200);
    const adminToken = adminLogin.body.accessToken as string;
    const reportId = await createReport(ownerToken);

    await request(app.getHttpServer())
      .patch(`/reports/${reportId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/reports/${reportId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' })
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
});

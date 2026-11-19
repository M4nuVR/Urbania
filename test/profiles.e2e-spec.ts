import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Profile } from '../src/profiles/entities/profile.entity';

describe('Profiles API (e2e)', () => {
  let app: INestApplication<App>;
  let profiles: Repository<Profile>;
  let anaToken: string;
  let beto: { token: string; id: string };

  async function register(
    email: string,
  ): Promise<{ token: string; id: string }> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        fullName: 'Pruebas Perfiles',
        password: 'contrasena-segura',
      })
      .expect(201);
    const token = response.body.accessToken as string;
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString(),
    ) as { sub: string };
    return { token, id: payload.sub };
  }

  const getMine = (token: string) =>
    request(app.getHttpServer())
      .get('/profiles/me')
      .set('Authorization', `Bearer ${token}`);
  const patchMine = (token: string, body: object) =>
    request(app.getHttpServer())
      .patch('/profiles/me')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

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
    profiles = app.get<Repository<Profile>>(getRepositoryToken(Profile));
    anaToken = (await register('profiles-ana@example.org')).token;
    beto = await register('profiles-beto@example.org');
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('requires authentication on both routes', async () => {
    await request(app.getHttpServer()).get('/profiles/me').expect(401);
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({ bio: 'x' })
      .expect(401);
  });

  it('returns { profile: null } for a user without profile', async () => {
    const response = await getMine(anaToken).expect(200);
    expect(response.body).toEqual({ profile: null });
  });

  it('creates once, then keeps the id and updates only sent fields', async () => {
    const created = await patchMine(anaToken, {
      avatarUrl: 'https://example.org/ana.png',
      bio: 'Vecina del centro',
    }).expect(200);
    const first = created.body.profile;
    expect(first).toMatchObject({
      avatarUrl: 'https://example.org/ana.png',
      bio: 'Vecina del centro',
    });

    const updated = await patchMine(anaToken, { bio: 'Nueva bio' }).expect(200);
    expect(updated.body.profile).toMatchObject({
      id: first.id,
      createdAt: first.createdAt,
      avatarUrl: 'https://example.org/ana.png',
      bio: 'Nueva bio',
    });

    const cleared = await patchMine(anaToken, { avatarUrl: null }).expect(200);
    expect(cleared.body.profile).toMatchObject({
      avatarUrl: null,
      bio: 'Nueva bio',
    });
    expect(await profiles.countBy({ userId: first.userId })).toBe(1);
  });

  it('keeps each user isolated to their own profile', async () => {
    const ana = (await getMine(anaToken).expect(200)).body.profile;
    expect((await getMine(beto.token).expect(200)).body).toEqual({
      profile: null,
    });

    await patchMine(beto.token, { bio: 'Perfil de Beto' }).expect(200);
    const betoProfile = (await getMine(beto.token).expect(200)).body.profile;
    expect(betoProfile.userId).toBe(beto.id);
    expect(betoProfile.id).not.toBe(ana.id);
    expect((await getMine(anaToken).expect(200)).body.profile.bio).toBe(
      'Nueva bio',
    );
  });

  it('rejects invalid bodies and server-owned fields', async () => {
    await patchMine(anaToken, {}).expect(400);
    await patchMine(anaToken, { avatarUrl: 'no-es-url' }).expect(400);
    await patchMine(anaToken, { avatarUrl: 'ftp://example.org/a.png' }).expect(
      400,
    );
    await patchMine(anaToken, { bio: 'x'.repeat(501) }).expect(400);
    await patchMine(anaToken, {
      avatarUrl: `https://example.org/${'a'.repeat(2048)}`,
    }).expect(400);
    await patchMine(anaToken, { bio: 'x', userId: beto.id }).expect(400);
    await patchMine(anaToken, { bio: 'x', role: 'ADMIN' }).expect(400);
  });

  it('leaves a single row after concurrent first updates', async () => {
    const carla = await register('profiles-carla@example.org');
    const responses = await Promise.all([
      patchMine(carla.token, { bio: 'Primera' }),
      patchMine(carla.token, { avatarUrl: 'https://example.org/c.png' }),
    ]);
    responses.forEach((response) => expect(response.status).toBe(200));
    expect(await profiles.countBy({ userId: carla.id })).toBe(1);
  });

  it('never exposes credentials', async () => {
    const response = await getMine(anaToken).expect(200);
    const body = JSON.stringify(response.body);
    expect(body).not.toMatch(/password/i);
    expect(response.body.profile.user).toBeUndefined();
  });
});

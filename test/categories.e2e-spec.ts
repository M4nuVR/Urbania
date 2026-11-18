import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Category } from '../src/categories/entities/category.entity';
import { User, UserRole } from '../src/users/user.entity';

describe('Categories API (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let citizenToken: string;
  let categories: Repository<Category>;

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
    categories = app.get<Repository<Category>>(getRepositoryToken(Category));

    async function register(email: string): Promise<string> {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          fullName: 'Pruebas Categorías',
          password: 'contrasena-segura',
        })
        .expect(201);
      return response.body.accessToken as string;
    }

    citizenToken = await register('categories-citizen@example.org');
    await register('categories-admin@example.org');
    // Solo el fixture de pruebas modifica el rol en la base de datos.
    await app
      .get<Repository<User>>(getRepositoryToken(User))
      .update(
        { email: 'categories-admin@example.org' },
        { role: UserRole.ADMIN },
      );
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'categories-admin@example.org',
        password: 'contrasena-segura',
      })
      .expect(200);
    adminToken = login.body.accessToken as string;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  async function createCategory(): Promise<Category> {
    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Vías', slug: `vias-${randomUUID()}` })
      .expect(201);
    return response.body as Category;
  }

  it('requires authentication for every category route', async () => {
    const id = randomUUID();
    await request(app.getHttpServer()).get('/categories').expect(401);
    await request(app.getHttpServer()).get(`/categories/${id}`).expect(401);
    await request(app.getHttpServer())
      .post('/categories')
      .send({ name: 'Vías', slug: 'vias' })
      .expect(401);
    await request(app.getHttpServer())
      .patch(`/categories/${id}`)
      .send({ name: 'Otro' })
      .expect(401);
    await request(app.getHttpServer()).delete(`/categories/${id}`).expect(401);
  });

  it('allows citizen reads but forbids all citizen writes', async () => {
    const category = await createCategory();
    const auth = { Authorization: `Bearer ${citizenToken}` };
    await request(app.getHttpServer()).get('/categories').set(auth).expect(200);
    await request(app.getHttpServer())
      .get(`/categories/${category.id}`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .post('/categories')
      .set(auth)
      .send({ name: 'Vías', slug: 'intento-ciudadano' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/categories/${category.id}`)
      .set(auth)
      .send({ name: 'Otro' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/categories/${category.id}`)
      .set(auth)
      .expect(403);
    expect(await categories.findOneByOrFail({ id: category.id })).toMatchObject(
      { name: 'Vías', isActive: true },
    );
  });

  it('normalizes inputs and rejects duplicate slugs after normalization', async () => {
    const slug = `vias-${randomUUID()}`;
    const auth = { Authorization: `Bearer ${adminToken}` };
    const created = await request(app.getHttpServer())
      .post('/categories')
      .set(auth)
      .send({
        name: ' Vías ',
        slug: ` ${slug.toUpperCase()} `,
        description: ' Calles ',
      })
      .expect(201);
    expect(created.body).toMatchObject({
      name: 'Vías',
      slug,
      description: 'Calles',
      isActive: true,
    });
    await request(app.getHttpServer())
      .post('/categories')
      .set(auth)
      .send({ name: 'Duplicada', slug })
      .expect(409);
    const other = await createCategory();
    await request(app.getHttpServer())
      .patch(`/categories/${other.id}`)
      .set(auth)
      .send({ slug })
      .expect(409);
  });

  it.each([
    { name: '   ', slug: 'empty-name' },
    { name: 'Vías', slug: 'con espacios' },
    { name: 'Vías', slug: '-guion-inicial' },
    { name: 'a'.repeat(101), slug: 'name-too-long' },
    { name: 'Vías', slug: 'a'.repeat(65) },
    { name: 'Vías', slug: 'long-description', description: 'a'.repeat(501) },
    { name: 'Vías', slug: 'bad-state', isActive: 'false' },
    { name: 'Vías', slug: 'null-state', isActive: null },
    { name: null, slug: 'null-name' },
    { name: 'Vías', slug: 'extra-id', id: 'client-owned-id' },
    { name: 'Vías', slug: 'extra-date', createdAt: '2020-01-01' },
  ])('rejects invalid create payload %#', async (body) => {
    await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(400);
  });

  it('rejects empty updates and null for non-nullable fields', async () => {
    const category = await createCategory();
    for (const body of [
      {},
      { name: null },
      { slug: null },
      { isActive: null },
      { name: '  ' },
      { id: randomUUID() },
    ]) {
      await request(app.getHttpServer())
        .patch(`/categories/${category.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body)
        .expect(400);
    }
  });

  it('updates only supplied fields and lets an admin clear the description', async () => {
    const category = await createCategory();
    const auth = { Authorization: `Bearer ${adminToken}` };
    const response = await request(app.getHttpServer())
      .patch(`/categories/${category.id}`)
      .set(auth)
      .send({ description: ' Nueva descripción ' })
      .expect(200);
    expect(response.body).toMatchObject({
      name: category.name,
      slug: category.slug,
      description: 'Nueva descripción',
    });
    const cleared = await request(app.getHttpServer())
      .patch(`/categories/${category.id}`)
      .set(auth)
      .send({ description: null, slug: category.slug })
      .expect(200);
    expect(cleared.body.description).toBeNull();
  });

  it('deactivates, preserves history and the slug, and allows reactivation', async () => {
    const category = await createCategory();
    const admin = { Authorization: `Bearer ${adminToken}` };
    const citizen = { Authorization: `Bearer ${citizenToken}` };
    await request(app.getHttpServer())
      .delete(`/categories/${category.id}`)
      .set(admin)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/categories/${category.id}`)
      .set(admin)
      .expect(200);
    expect(await categories.findOneByOrFail({ id: category.id })).toMatchObject(
      { isActive: false },
    );
    const list = await request(app.getHttpServer())
      .get('/categories')
      .set(citizen)
      .expect(200);
    expect(list.body.every((item: Category) => item.isActive)).toBe(true);
    expect(list.body.some((item: Category) => item.id === category.id)).toBe(
      false,
    );
    const detail = await request(app.getHttpServer())
      .get(`/categories/${category.id}`)
      .set(citizen)
      .expect(200);
    expect(detail.body.isActive).toBe(false);
    await request(app.getHttpServer())
      .post('/categories')
      .set(admin)
      .send({ name: 'Reutilizar', slug: category.slug })
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/categories/${category.id}`)
      .set(admin)
      .send({ isActive: true })
      .expect(200);
    const reactivated = await request(app.getHttpServer())
      .get('/categories')
      .set(citizen)
      .expect(200);
    expect(
      reactivated.body.some((item: Category) => item.id === category.id),
    ).toBe(true);
  });

  it('rejects invalid UUIDs and handles missing categories', async () => {
    const auth = { Authorization: `Bearer ${adminToken}` };
    await request(app.getHttpServer())
      .get('/categories/not-a-uuid')
      .set(auth)
      .expect(400);
    await request(app.getHttpServer())
      .patch('/categories/not-a-uuid')
      .set(auth)
      .send({ name: 'Otro' })
      .expect(400);
    await request(app.getHttpServer())
      .delete('/categories/not-a-uuid')
      .set(auth)
      .expect(400);
    const id = randomUUID();
    await request(app.getHttpServer())
      .get(`/categories/${id}`)
      .set(auth)
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/categories/${id}`)
      .set(auth)
      .send({ name: 'Otro' })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/categories/${id}`)
      .set(auth)
      .expect(404);
  });

  it('enforces slug uniqueness in the database, bypassing service prechecks', async () => {
    const category = await createCategory();
    await expect(
      categories.insert({
        id: randomUUID(),
        name: 'Duplicada',
        slug: category.slug,
      }),
    ).rejects.toThrow();
  });

  it('publishes the category routes and schemas in Swagger', () => {
    const config = new DocumentBuilder()
      .setTitle('Urbania')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    expect(document.paths['/categories']?.post).toBeDefined();
    expect(document.paths['/categories']?.get).toBeDefined();
    expect(document.paths['/categories/{id}']?.get).toBeDefined();
    expect(document.paths['/categories/{id}']?.patch).toBeDefined();
    expect(document.paths['/categories/{id}']?.delete).toBeDefined();
    expect(document.components?.schemas?.['CreateCategoryDto']).toBeDefined();
    expect(document.components?.schemas?.['UpdateCategoryDto']).toBeDefined();
  });
});

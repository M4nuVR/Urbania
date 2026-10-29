import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// PrismaService simulado: estas pruebas validan rutas, guards y DTOs sin PostgreSQL.
const prismaMock = {
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $queryRaw: vi.fn(),
  user: { findUnique: vi.fn() },
};

const USER_ID = '55555555-5555-4555-8555-555555555555';
const REPORT_ID = '11111111-1111-4111-8111-111111111111';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.DEV_AUTH = 'true';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

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

  it('impide que un ciudadano cambie el estado', () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: USER_ID,
      role: 'CITIZEN',
    });
    return request(app.getHttpServer())
      .patch(`/reports/${REPORT_ID}/status`)
      .set('x-user-id', USER_ID)
      .send({ newStatus: 'UNDER_REVIEW' })
      .expect(403);
  });

  it('rechaza un estado inválido y campos no permitidos', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: USER_ID,
      role: 'ADMIN',
    });
    await request(app.getHttpServer())
      .patch(`/reports/${REPORT_ID}/status`)
      .set('x-user-id', USER_ID)
      .send({ newStatus: 'CERRADO' })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/reports/${REPORT_ID}/status`)
      .set('x-user-id', USER_ID)
      .send({ newStatus: 'UNDER_REVIEW', changedBy: USER_ID })
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});

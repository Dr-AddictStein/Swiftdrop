import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('returns structured JSON for unknown routes', async () => {
    const response = await request(app.getHttpServer())
      .get('/unknown-route')
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      path: '/unknown-route',
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  afterEach(async () => {
    await app.close();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('is public (no API key required) but validates the payload', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: '123' })
        .expect(400);
    });

    it('rejects an empty body', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/register', () => {
    it('is public (no API key required) but rejects an empty body', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({})
        .expect(400);
    });

    it('rejects an invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          companyName: 'Acme Delivery',
          name: 'Alice Admin',
          email: 'not-an-email',
          password: 'securepassword',
        })
        .expect(400);
    });

    it('rejects a password shorter than 6 characters', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          companyName: 'Acme Delivery',
          name: 'Alice Admin',
          email: 'alice@acme.com',
          password: '123',
        })
        .expect(400);
    });

    it('rejects a blank company name', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          companyName: '',
          name: 'Alice Admin',
          email: 'alice@acme.com',
          password: 'securepassword',
        })
        .expect(400);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { UserRole } from '../src/common/enums/user-role.enum';
import { AppModule } from '../src/app.module';

/**
 * These tests exercise the global ApiKeyGuard + JwtAuthGuard and the per-route
 * RolesGuard. Guards run before the request ever reaches a controller/service,
 * so no database access is required (mirrors the DB-free CI environment).
 */
describe('Access control (e2e)', () => {
  let app: NestFastifyApplication;

  const apiKey = process.env.API_KEY ?? 'test-api-key';
  const jwtSecret = process.env.JWT_SECRET ?? 'test-jwt-secret';

  const signToken = (role: UserRole, companyId: string | null): string =>
    jwt.sign(
      {
        sub: `user-${role}`,
        email: `${role.toLowerCase()}@example.com`,
        role,
        companyId,
      },
      jwtSecret,
      { expiresIn: '1h' },
    );

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

  describe('API key guard', () => {
    it('rejects a protected route with no API key', () => {
      return request(app.getHttpServer()).get('/companies').expect(401);
    });

    it('rejects a protected route with an invalid API key', () => {
      return request(app.getHttpServer())
        .get('/companies')
        .set('x-api-key', 'wrong-key')
        .expect(401);
    });

    it('runs before role checks (platform route without API key is 401, not 403)', () => {
      return request(app.getHttpServer()).get('/platform/overview').expect(401);
    });
  });

  describe('JWT auth guard', () => {
    it('rejects a valid API key with no bearer token', () => {
      return request(app.getHttpServer())
        .get('/companies')
        .set('x-api-key', apiKey)
        .expect(401);
    });

    it('rejects a malformed bearer token', () => {
      return request(app.getHttpServer())
        .get('/companies')
        .set('x-api-key', apiKey)
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });
  });

  describe('Roles guard (multi-tenant RBAC)', () => {
    it('forbids an ADMIN from the SUPER_ADMIN platform routes', () => {
      const token = signToken(UserRole.ADMIN, 'company-1');
      return request(app.getHttpServer())
        .get('/platform/overview')
        .set('x-api-key', apiKey)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('forbids a DELIVERY_AGENT from the SUPER_ADMIN platform routes', () => {
      const token = signToken(UserRole.DELIVERY_AGENT, 'company-1');
      return request(app.getHttpServer())
        .get('/platform/companies')
        .set('x-api-key', apiKey)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('forbids a DELIVERY_AGENT from an ADMIN-only route', () => {
      const token = signToken(UserRole.DELIVERY_AGENT, 'company-1');
      return request(app.getHttpServer())
        .get('/companies/me')
        .set('x-api-key', apiKey)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });
});

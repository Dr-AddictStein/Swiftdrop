import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import * as yaml from 'js-yaml';
import { AppModule } from './app.module';

function resolveOpenApiPath(): string | null {
  const candidates = [
    join(process.cwd(), 'docs', 'openapi.yaml'),
    join(__dirname, '..', '..', 'docs', 'openapi.yaml'),
    join(__dirname, '..', 'docs', 'openapi.yaml'),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function setupApiDocs(app: NestFastifyApplication): void {
  const logger = new Logger('ApiDocs');
  const openApiPath = resolveOpenApiPath();

  if (!openApiPath) {
    logger.warn('docs/openapi.yaml not found; skipping /docs route.');
    return;
  }

  const document = yaml.load(
    readFileSync(openApiPath, 'utf8'),
  ) as OpenAPIObject;

  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    yamlDocumentUrl: 'docs-yaml',
    customSiteTitle: 'Swiftdrop API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      tagsSorter: 'alpha',
    },
  });

  logger.log('API docs available at /docs (spec at /docs-json).');
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('port');

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  });

  setupApiDocs(app);

  await app.listen(port, '0.0.0.0');
}

void bootstrap();

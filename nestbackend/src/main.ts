// MUST be the very first import — sets up OpenTelemetry auto-instrumentation
// before any other module loads (otherwise instrumentations cannot patch them).
import './tracing';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // CLIENT_URL may be a comma-separated allow-list of frontend origins.
  const origins = (process.env.CLIENT_URL ?? 'http://localhost:3001')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });

  // Validation is registered once, globally, as APP_PIPE in AppModule.
  // Let class-validator resolve custom constraint classes through Nest DI.
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // Run OnModuleDestroy / OnApplicationShutdown on SIGTERM (Redis, BullMQ, OTel flush).
  app.enableShutdownHooks();

  if (process.env.NODE_ENV !== 'production') {
    // Swagger covers the REST surface (OAuth token endpoints, health, JWKS).
    // The main API is GraphQL — explore it at /graphql.
    const config = new DocumentBuilder()
      .setTitle('Internship Platform API')
      .setDescription('REST endpoints: OAuth 2.0 token service, health checks, JWKS')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT-auth')
      .build();
    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
    });
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha', operationsSorter: 'alpha' },
    });
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`HTTP + GraphQL listening on http://localhost:${port} (GraphQL at /graphql)`);
}

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', reason instanceof Error ? reason.stack : String(reason));
});

// After an uncaught exception the process state is undefined: log and exit so
// the orchestrator (Docker / k8s) restarts a clean instance.
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception — exiting', error?.stack ?? String(error));
  process.exit(1);
});

bootstrap().catch((error: unknown) => {
  logger.error('Failed to bootstrap application', error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

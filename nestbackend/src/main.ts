import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { useContainer } from 'class-validator';
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';

const logger = new Logger('Bootstrap');

// Convert to top-level await
const start = async () => {
  try {
    const app = await NestFactory.create(AppModule);

    // Enable CORS
    app.enableCors({
      origin: process.env.CLIENT_URL || 'http://localhost:3001',
      credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Enable DI for class-validator
    const appSelect = app.select(AppModule);
    useContainer(appSelect, { 
      fallbackOnErrors: true
    });
    // Handle container errors globally
    process.on('unhandledRejection', (reason: unknown) => {
      const error = reason instanceof Error 
        ? reason 
        : new Error(String(reason));
      logger.error('Unhandled Rejection:', error);
    });
    
    process.on('uncaughtException', (error: unknown) => {
      if (error === null || error === undefined) {
        logger.error('Uncaught Exception: Received null or undefined');
        return;
      }
      
      const safeError = error instanceof Error 
        ? error 
        : new Error(`Non-Error exception: ${String(error as unknown)}`);
      
      logger.error('Uncaught Exception:', safeError);
    });

    // Swagger documentation
    if (process.env.NODE_ENV !== 'production') {
      try {
        const config: Omit<OpenAPIObject, 'paths'> = new DocumentBuilder()
          .setTitle('Internship Platform API')
          .setDescription('API documentation for Internship Platform')
          .setVersion('1.0')
          .addBearerAuth(
            {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              name: 'JWT',
              description: 'Enter JWT token',
              in: 'header',
            },
            'JWT-auth', // This name is used to reference this security scheme
          )
          .build();
        const document = SwaggerModule.createDocument(app, config, {
          operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
        });
        SwaggerModule.setup('api', app, document, {
          swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
          },
        });
        logger.log('Swagger documentation initialized at /api');
      } catch (swaggerError: unknown) {
        if (swaggerError instanceof Error) {
          logger.error('Failed to initialize Swagger: ' + swaggerError.message, swaggerError.stack);
        } else {
          logger.error('Failed to initialize Swagger: ' + String(swaggerError));
        }
      }
    }

    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`Application is running on: http://localhost:${port}`);
  } catch (error) {
    logger.error('Failed to start application', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
};

// Start the application
start().catch((error: unknown) => {
  logger.error(
    'Failed to bootstrap application',
    error instanceof Error ? error : new Error(String(error)),
  );
  process.exit(1);
});
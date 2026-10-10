import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser = require('cookie-parser');
import helmet from 'helmet';
import { AppModule } from './app.module';
import { SESSION_AUTH_NAME } from './auth/decorators/authenticated.decorator';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT', '3001'));
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  const allowedOrigins = configService
    .get<string>('CORS_ORIGIN', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());

  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (configService.get<string>('SWAGGER_ENABLED', 'true') === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ARPA API')
      .setDescription(
        'API de ARPA. Los endpoints bancarios documentan su correspondencia con BIAN cuando aplica.',
      )
      .setVersion('1.0')
      .addCookieAuth(
        configService.get<string>('SESSION_COOKIE_NAME', 'arpa_session'),
        {
          type: 'apiKey',
          in: 'cookie',
          description: 'Cookie HttpOnly creada por POST /api/v1/auth/login.',
        },
        SESSION_AUTH_NAME,
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      jsonDocumentUrl: `${apiPrefix}/docs-json`,
      customSiteTitle: 'ARPA API Docs',
    });
  }

  await app.listen(port);
  Logger.log(`API disponible en http://localhost:${port}/${apiPrefix}/v1`);
  Logger.log(
    `Swagger disponible en http://localhost:${port}/${apiPrefix}/docs`,
  );
}
void bootstrap();

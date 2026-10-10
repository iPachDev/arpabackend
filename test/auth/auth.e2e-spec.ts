import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import cookieParser = require('cookie-parser');
import * as request from 'supertest';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import { SessionAuthGuard } from '../../src/auth/guards/session-auth.guard';
import { UserRole } from '../../src/users/schemas/user.schema';

describe('Authentication endpoints', () => {
  let app: INestApplication;
  const authService = {
    login: jest.fn(),
    authenticateSession: jest.fn(),
    listSessions: jest.fn(),
    logout: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string, fallback?: string) => {
      const values: Record<string, string> = {
        SESSION_COOKIE_NAME: 'arpa_session',
        NODE_ENV: 'test',
      };
      return values[key] ?? fallback;
    }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: configService },
        { provide: APP_GUARD, useClass: SessionAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('crea una cookie HttpOnly y SameSite estricta al iniciar sesión', async () => {
    authService.login.mockResolvedValue({
      user: {
        id: '66f84cbd29d229e491a23362',
        name: 'Fernando Pacheco',
        email: 'fernando@example.com',
        role: UserRole.READER,
      },
      expiresAt: new Date('2026-10-04T12:00:00.000Z'),
      sessionToken: 'opaque-session-token',
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'fernando@example.com', password: 'MiPassword123' })
      .expect(200);

    const cookie = response.headers['set-cookie'][0] as string;
    expect(cookie).toContain('arpa_session=opaque-session-token');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(response.body).not.toHaveProperty('sessionToken');
  });

  it('protege el listado de sesiones cuando no hay cookie', () =>
    request(app.getHttpServer()).get('/api/v1/auth/sessions').expect(401));

  it('permite consultar sesiones con autenticación y rol válidos', async () => {
    authService.authenticateSession.mockResolvedValue({
      id: '66f84cbd29d229e491a23362',
      name: 'Fernando Pacheco',
      email: 'fernando@example.com',
      role: UserRole.READER,
      sessionId: 'session-id',
    });
    authService.listSessions.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/api/v1/auth/sessions')
      .set('Cookie', 'arpa_session=valid-token')
      .expect(200)
      .expect([]);
  });

  it('revoca la sesión, elimina la cookie y responde 204', async () => {
    authService.logout.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', 'arpa_session=valid-token')
      .expect(204);

    expect(authService.logout).toHaveBeenCalledWith('valid-token');
    const cookie = response.headers['set-cookie'][0] as string;
    expect(cookie).toContain('arpa_session=;');
    expect(cookie).toContain('Expires=Thu, 01 Jan 1970');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
  });
});

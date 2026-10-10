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
import { AuthService } from '../../src/auth/auth.service';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import { SessionAuthGuard } from '../../src/auth/guards/session-auth.guard';
import { ProfileController } from '../../src/profile/profile.controller';
import { ProfileService } from '../../src/profile/profile.service';
import { UserRole } from '../../src/users/schemas/user.schema';

describe('Profile endpoints', () => {
  let app: INestApplication;
  const userId = '66f84cbd29d229e491a23362';
  const authService = { authenticateSession: jest.fn() };
  const profileService = {
    get: jest.fn(),
    update: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ProfileService, useValue: profileService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => 'arpa_session') },
        },
        { provide: APP_GUARD, useClass: SessionAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => app.close());
  beforeEach(() => {
    jest.clearAllMocks();
    authService.authenticateSession.mockResolvedValue({
      id: userId,
      name: 'Fernando Pacheco',
      email: 'fernando@example.com',
      role: UserRole.READER,
      sessionId: 'session-id',
    });
  });

  it('rechaza la consulta sin una sesión', () =>
    request(app.getHttpServer()).get('/api/v1/profile').expect(401));

  it('permite consultar el perfil con sesión y rol válidos', async () => {
    profileService.get.mockResolvedValue({
      id: userId,
      name: 'Fernando Pacheco',
      email: 'fernando@example.com',
      phone: '+525512345678',
      favoriteCategories: [],
    });

    await request(app.getHttpServer())
      .get('/api/v1/profile')
      .set('Cookie', 'arpa_session=valid-token')
      .expect(200);

    expect(profileService.get).toHaveBeenCalledWith(userId);
  });

  it('normaliza y actualiza solamente campos editables', async () => {
    profileService.update.mockImplementation(
      async (_id: string, profile: Record<string, unknown>) => ({
        id: userId,
        email: 'fernando@example.com',
        ...profile,
      }),
    );

    await request(app.getHttpServer())
      .patch('/api/v1/profile')
      .set('Cookie', 'arpa_session=valid-token')
      .send({ alias: '  ipach  ', phone: '+52 (55) 1234-5678' })
      .expect(200);

    expect(profileService.update).toHaveBeenCalledWith(userId, {
      alias: 'ipach',
      phone: '+525512345678',
    });
  });

  it('impide modificar el correo desde el perfil', () =>
    request(app.getHttpServer())
      .patch('/api/v1/profile')
      .set('Cookie', 'arpa_session=valid-token')
      .send({ email: 'otro@example.com' })
      .expect(400));

  it('cambia la contraseña con la sesión autenticada', async () => {
    profileService.changePassword.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .patch('/api/v1/profile/password')
      .set('Cookie', 'arpa_session=valid-token')
      .send({
        currentPassword: 'PasswordActual123',
        newPassword: 'PasswordNueva456',
        confirmPassword: 'PasswordNueva456',
      })
      .expect(204);

    expect(profileService.changePassword).toHaveBeenCalledWith(
      userId,
      'session-id',
      {
        currentPassword: 'PasswordActual123',
        newPassword: 'PasswordNueva456',
        confirmPassword: 'PasswordNueva456',
      },
    );
  });

  it('rechaza contraseñas nuevas demasiado cortas', () =>
    request(app.getHttpServer())
      .patch('/api/v1/profile/password')
      .set('Cookie', 'arpa_session=valid-token')
      .send({
        currentPassword: 'PasswordActual123',
        newPassword: 'corta',
        confirmPassword: 'corta',
      })
      .expect(400));
});

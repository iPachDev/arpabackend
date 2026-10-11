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
import { NotificationsController } from '../../src/notifications/notifications.controller';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { UserRole } from '../../src/users/schemas/user.schema';

describe('Notification endpoints', () => {
  let app: INestApplication;
  const userId = '66f84cbd29d229e491a23362';
  const authService = { authenticateSession: jest.fn() };
  const notificationsService = {
    listMine: jest.fn(),
    markAsRead: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: NotificationsService, useValue: notificationsService },
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
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => app.close());
  beforeEach(() => {
    jest.clearAllMocks();
    authService.authenticateSession.mockResolvedValue({
      id: userId,
      role: UserRole.READER,
      sessionId: 'session-id',
    });
  });

  it('protege la consulta sin sesión', () =>
    request(app.getHttpServer()).get('/api/v1/notifications/mine').expect(401));

  it('consulta únicamente las notificaciones del usuario autenticado', async () => {
    notificationsService.listMine.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/api/v1/notifications/mine')
      .set('Cookie', 'arpa_session=valid-token')
      .expect(200)
      .expect([]);

    expect(notificationsService.listMine).toHaveBeenCalledWith(userId);
  });

  it('marca una notificación propia como leída', async () => {
    const notificationId = '66f84cbd29d229e491a23363';
    notificationsService.markAsRead.mockResolvedValue({ id: notificationId });

    await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Cookie', 'arpa_session=valid-token')
      .expect(200)
      .expect({ id: notificationId });

    expect(notificationsService.markAsRead).toHaveBeenCalledWith(
      userId,
      notificationId,
    );
  });
});

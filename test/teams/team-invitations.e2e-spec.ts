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
import { TeamInvitationsController } from '../../src/teams/team-invitations.controller';
import { TeamInvitationsService } from '../../src/teams/team-invitations.service';
import { UserRole } from '../../src/users/schemas/user.schema';

describe('Team invitation endpoints', () => {
  let app: INestApplication;
  const authService = { authenticateSession: jest.fn() };
  const invitationsService = { preview: jest.fn(), accept: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [TeamInvitationsController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: TeamInvitationsService, useValue: invitationsService },
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
      id: '66f84cbd29d229e491a23362',
      name: 'Mariana López',
      email: 'mariana@example.com',
      role: UserRole.READER,
      sessionId: 'session-id',
    });
  });

  it('permite consultar públicamente el contexto de la invitación', async () => {
    invitationsService.preview.mockResolvedValue({
      teamName: 'ARPA Racing Team',
      teamSlug: 'arpa-racing-team',
      email: 'mariana@example.com',
      status: 'pending',
      requiresRegistration: false,
    });

    await request(app.getHttpServer())
      .get('/api/v1/team-invitations/opaque-token')
      .expect(200);

    expect(invitationsService.preview).toHaveBeenCalledWith('opaque-token');
  });

  it('protege la aceptación cuando no hay sesión', () =>
    request(app.getHttpServer())
      .post('/api/v1/team-invitations/opaque-token/accept')
      .expect(401));

  it('acepta usando la identidad de la sesión', async () => {
    invitationsService.accept.mockResolvedValue({
      teamSlug: 'arpa-racing-team',
      teamName: 'ARPA Racing Team',
    });

    await request(app.getHttpServer())
      .post('/api/v1/team-invitations/opaque-token/accept')
      .set('Cookie', 'arpa_session=valid-token')
      .expect(200);

    expect(invitationsService.accept).toHaveBeenCalledWith(
      'opaque-token',
      '66f84cbd29d229e491a23362',
      'mariana@example.com',
    );
  });
});

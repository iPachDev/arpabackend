import { INestApplication, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import cookieParser = require('cookie-parser');
import * as request from 'supertest';
import { AuthService } from '../../src/auth/auth.service';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import { SessionAuthGuard } from '../../src/auth/guards/session-auth.guard';
import { EventOwnershipTransfersController } from '../../src/events/event-ownership-transfers.controller';
import { EventOwnershipTransfersService } from '../../src/events/event-ownership-transfers.service';
import { UserRole } from '../../src/users/schemas/user.schema';

describe('Event ownership transfer endpoints', () => {
  let app: INestApplication;
  const userId = '66f84cbd29d229e491a23362';
  const authService = { authenticateSession: jest.fn() };
  const transfersService = { preview: jest.fn(), accept: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [EventOwnershipTransfersController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: EventOwnershipTransfersService,
          useValue: transfersService,
        },
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
    await app.init();
  });

  afterAll(async () => app.close());
  beforeEach(() => {
    jest.clearAllMocks();
    authService.authenticateSession.mockResolvedValue({
      id: userId,
      email: 'nueva@example.com',
      role: UserRole.READER,
      sessionId: 'session-id',
    });
  });

  it('permite consultar públicamente la transferencia', async () => {
    transfersService.preview.mockResolvedValue({ status: 'pending' });

    await request(app.getHttpServer())
      .get('/api/v1/event-ownership-transfers/opaque-token')
      .expect(200)
      .expect({ status: 'pending' });

    expect(transfersService.preview).toHaveBeenCalledWith('opaque-token');
  });

  it('protege la aceptación cuando no hay sesión', () =>
    request(app.getHttpServer())
      .post('/api/v1/event-ownership-transfers/opaque-token/accept')
      .expect(401));

  it('acepta con la identidad de la sesión', async () => {
    transfersService.accept.mockResolvedValue({ eventSlug: 'copa-arpa' });

    await request(app.getHttpServer())
      .post('/api/v1/event-ownership-transfers/opaque-token/accept')
      .set('Cookie', 'arpa_session=valid-token')
      .expect(200);

    expect(transfersService.accept).toHaveBeenCalledWith(
      'opaque-token',
      userId,
      'nueva@example.com',
    );
  });
});

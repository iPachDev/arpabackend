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
import { EventRegistrationsController } from '../../src/events/event-registrations.controller';
import { EventRegistrationsService } from '../../src/events/event-registrations.service';
import { EventOwnershipTransfersService } from '../../src/events/event-ownership-transfers.service';
import { EventsController } from '../../src/events/events.controller';
import { EventsService } from '../../src/events/events.service';
import {
  EventDiscipline,
  EventType,
} from '../../src/events/schemas/event.schema';
import { UserRole } from '../../src/users/schemas/user.schema';

describe('Event endpoints', () => {
  let app: INestApplication;
  const userId = '66f84cbd29d229e491a23362';
  const authService = { authenticateSession: jest.fn() };
  const eventsService = {
    create: jest.fn(),
    listMine: jest.fn(),
    listPublished: jest.fn(),
    getBySlug: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  };
  const registrationsService = {
    register: jest.fn(),
    cancel: jest.fn(),
    listMine: jest.fn(),
  };
  const transfersService = { invite: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [EventsController, EventRegistrationsController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: EventsService, useValue: eventsService },
        {
          provide: EventRegistrationsService,
          useValue: registrationsService,
        },
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

  it('protege el catálogo cuando no hay sesión', () =>
    request(app.getHttpServer()).get('/api/v1/events').expect(401));

  it('permite que un usuario autenticado cree su evento', async () => {
    const input = {
      title: 'Copa ARPA',
      type: EventType.COMPETITION,
      discipline: EventDiscipline.KARTING,
      description: 'Competencia regional abierta a diferentes categorías.',
      sessions: [
        {
          name: 'Fecha #1',
          startsAt: '2026-12-10T15:00:00.000Z',
          endsAt: '2026-12-10T20:00:00.000Z',
          location: null,
        },
      ],
    };
    eventsService.create.mockResolvedValue({ slug: 'copa-arpa', ...input });

    await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Cookie', 'arpa_session=valid-token')
      .send(input)
      .expect(201);

    expect(eventsService.create).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        title: input.title,
        sessions: [
          expect.objectContaining({
            name: 'Fecha #1',
            startsAt: expect.any(Date),
            endsAt: expect.any(Date),
          }),
        ],
      }),
    );
  });

  it('permite inscribirse y consultar mis inscripciones', async () => {
    registrationsService.register.mockResolvedValue({
      id: 'registration-id',
      status: 'registered',
    });
    registrationsService.listMine.mockResolvedValue([]);

    await request(app.getHttpServer())
      .post('/api/v1/events/copa-arpa/registrations')
      .set('Cookie', 'arpa_session=valid-token')
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/event-registrations/mine')
      .set('Cookie', 'arpa_session=valid-token')
      .expect(200)
      .expect([]);

    expect(registrationsService.register).toHaveBeenCalledWith(
      userId,
      'copa-arpa',
    );
    expect(registrationsService.listMine).toHaveBeenCalledWith(userId);
  });

  it('cancela la inscripción con una baja lógica', async () => {
    registrationsService.cancel.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete('/api/v1/events/copa-arpa/registrations/me')
      .set('Cookie', 'arpa_session=valid-token')
      .expect(204);

    expect(registrationsService.cancel).toHaveBeenCalledWith(
      userId,
      'copa-arpa',
    );
  });

  it('solicita la transferencia de propiedad al usuario indicado', async () => {
    transfersService.invite.mockResolvedValue({ status: 'pending' });

    await request(app.getHttpServer())
      .post('/api/v1/events/copa-arpa/ownership-transfers')
      .set('Cookie', 'arpa_session=valid-token')
      .send({ email: 'nueva@example.com' })
      .expect(201);

    expect(transfersService.invite).toHaveBeenCalledWith(userId, 'copa-arpa', {
      email: 'nueva@example.com',
    });
  });

  it('da de baja el evento con confirmación explícita', async () => {
    eventsService.archive.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete('/api/v1/events/copa-arpa')
      .set('Cookie', 'arpa_session=valid-token')
      .send({ confirmationTitle: 'Copa ARPA' })
      .expect(204);

    expect(eventsService.archive).toHaveBeenCalledWith(userId, 'copa-arpa', {
      confirmationTitle: 'Copa ARPA',
    });
  });
});

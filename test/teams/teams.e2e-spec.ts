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
import {
  TeamDiscipline,
  TeamPrivacy,
} from '../../src/teams/schemas/team.schema';
import { TeamInvitationsService } from '../../src/teams/team-invitations.service';
import { TeamsController } from '../../src/teams/teams.controller';
import { TeamsService } from '../../src/teams/teams.service';
import { UserRole } from '../../src/users/schemas/user.schema';

describe('Team endpoints', () => {
  let app: INestApplication;
  const userId = '66f84cbd29d229e491a23362';
  const authService = { authenticateSession: jest.fn() };
  const teamsService = {
    create: jest.fn(),
    listMine: jest.fn(),
    getMineBySlug: jest.fn(),
  };
  const invitationsService = {
    invite: jest.fn(),
    listRoster: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: TeamsService, useValue: teamsService },
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
      id: userId,
      name: 'Fernando Pacheco',
      email: 'fernando@example.com',
      role: UserRole.READER,
      sessionId: 'session-id',
    });
  });

  it('protege la creación cuando no hay sesión', () =>
    request(app.getHttpServer()).post('/api/v1/teams').expect(401));

  it('crea un equipo asignando el usuario autenticado', async () => {
    const input = {
      name: 'ARPA Racing Team',
      discipline: TeamDiscipline.KARTING,
      privacy: TeamPrivacy.PRIVATE,
      location: 'Ciudad de México',
      description: 'Equipo enfocado en competencias regionales.',
    };
    teamsService.create.mockResolvedValue({
      id: 'team-id',
      slug: 'arpa-racing-team',
      ...input,
      membershipRole: 'owner',
      memberCount: 1,
    });

    await request(app.getHttpServer())
      .post('/api/v1/teams')
      .set('Cookie', 'arpa_session=valid-token')
      .send(input)
      .expect(201);

    expect(teamsService.create).toHaveBeenCalledWith(userId, input);
  });

  it('lista los equipos del usuario autenticado', async () => {
    teamsService.listMine.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/api/v1/teams/mine')
      .set('Cookie', 'arpa_session=valid-token')
      .expect(200)
      .expect([]);

    expect(teamsService.listMine).toHaveBeenCalledWith(userId);
  });

  it('rechaza una disciplina fuera del catálogo', () =>
    request(app.getHttpServer())
      .post('/api/v1/teams')
      .set('Cookie', 'arpa_session=valid-token')
      .send({
        name: 'ARPA Racing Team',
        discipline: 'natacion',
        privacy: TeamPrivacy.PRIVATE,
        location: 'Ciudad de México',
        description: 'Equipo enfocado en competencias regionales.',
      })
      .expect(400));
});

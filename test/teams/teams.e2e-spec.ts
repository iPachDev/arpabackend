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
import { TeamOwnershipTransfersService } from '../../src/teams/team-ownership-transfers.service';
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
    getBySlug: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    uploadPhotos: jest.fn(),
    uploadImage: jest.fn(),
  };
  const invitationsService = {
    invite: jest.fn(),
    listRoster: jest.fn(),
    removeMember: jest.fn(),
    cancelInvitation: jest.fn(),
  };
  const ownershipTransfersService = { invite: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: TeamsService, useValue: teamsService },
        { provide: TeamInvitationsService, useValue: invitationsService },
        {
          provide: TeamOwnershipTransfersService,
          useValue: ownershipTransfersService,
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

  it('sube fotos válidas al equipo autenticado', async () => {
    teamsService.uploadPhotos.mockResolvedValue({
      id: 'team-id',
      slug: 'arpa-racing-team',
      photoUrls: ['https://signed.example/photo'],
    });

    await request(app.getHttpServer())
      .post('/api/v1/teams/arpa-racing-team/photos')
      .set('Cookie', 'arpa_session=valid-token')
      .attach(
        'files',
        Buffer.from(
          'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEALmk0mk0iIiIiIgBoSygABc6zbAAA',
          'base64',
        ),
        { filename: 'team.webp', contentType: 'image/webp' },
      )
      .expect(200);

    expect(teamsService.uploadPhotos).toHaveBeenCalledWith(
      userId,
      'arpa-racing-team',
      expect.arrayContaining([
        expect.objectContaining({ mimetype: 'image/webp' }),
      ]),
    );
  });

  it('rechaza archivos que no sean imágenes válidas', () =>
    request(app.getHttpServer())
      .post('/api/v1/teams/arpa-racing-team/photos')
      .set('Cookie', 'arpa_session=valid-token')
      .attach('files', Buffer.from('invalid'), {
        filename: 'team.svg',
        contentType: 'image/svg+xml',
      })
      .expect(400));

  it('sube una portada válida al equipo autenticado', async () => {
    teamsService.uploadImage.mockResolvedValue({
      id: 'team-id',
      slug: 'arpa-racing-team',
      coverImageUrl: 'https://signed.example/cover',
    });

    await request(app.getHttpServer())
      .post('/api/v1/teams/arpa-racing-team/images/cover')
      .set('Cookie', 'arpa_session=valid-token')
      .attach(
        'file',
        Buffer.from(
          'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEALmk0mk0iIiIiIgBoSygABc6zbAAA',
          'base64',
        ),
        { filename: 'cover.webp', contentType: 'image/webp' },
      )
      .expect(200);

    expect(teamsService.uploadImage).toHaveBeenCalledWith(
      userId,
      'arpa-racing-team',
      'cover',
      expect.objectContaining({ mimetype: 'image/webp' }),
    );
  });

  it('rechaza un tipo de imagen de equipo desconocido', () =>
    request(app.getHttpServer())
      .post('/api/v1/teams/arpa-racing-team/images/banner')
      .set('Cookie', 'arpa_session=valid-token')
      .attach(
        'file',
        Buffer.from(
          'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEALmk0mk0iIiIiIgBoSygABc6zbAAA',
          'base64',
        ),
        { filename: 'cover.webp', contentType: 'image/webp' },
      )
      .expect(400));

  it('crea una transferencia de propiedad para el owner', async () => {
    ownershipTransfersService.invite.mockResolvedValue({
      id: 'transfer-id',
      teamName: 'ARPA Racing Team',
      email: 'nueva@example.com',
      status: 'pending',
      expiresAt: '2026-10-18T12:00:00.000Z',
    });

    await request(app.getHttpServer())
      .post('/api/v1/teams/arpa-racing-team/ownership-transfers')
      .set('Cookie', 'arpa_session=session-token')
      .send({ email: ' NUEVA@EXAMPLE.COM ' })
      .expect(201);

    expect(ownershipTransfersService.invite).toHaveBeenCalledWith(
      userId,
      'arpa-racing-team',
      { email: 'nueva@example.com' },
    );
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

  it('permite consultar un perfil compartible con sesión', async () => {
    teamsService.getBySlug.mockResolvedValue({
      id: 'team-id',
      slug: 'arpa-racing-team',
      name: 'ARPA Racing Team',
      privacy: TeamPrivacy.PUBLIC,
      membershipRole: null,
      isPrivateView: false,
      photoUrls: [],
    });

    await request(app.getHttpServer())
      .get('/api/v1/teams/arpa-racing-team')
      .set('Cookie', 'arpa_session=valid-token')
      .expect(200);

    expect(teamsService.getBySlug).toHaveBeenCalledWith(
      userId,
      'arpa-racing-team',
    );
  });

  it('protege el perfil compartible para usuarios sin sesión', () =>
    request(app.getHttpServer())
      .get('/api/v1/teams/arpa-racing-team')
      .expect(401));

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

  it('actualiza un equipo del owner', async () => {
    teamsService.update.mockResolvedValue({
      id: 'team-id',
      slug: 'arpa-racing-team',
      name: 'ARPA Racing Team',
      description: 'Nueva descripción suficientemente extensa.',
    });

    await request(app.getHttpServer())
      .patch('/api/v1/teams/arpa-racing-team')
      .set('Cookie', 'arpa_session=valid-token')
      .send({ description: 'Nueva descripción suficientemente extensa.' })
      .expect(200);

    expect(teamsService.update).toHaveBeenCalledWith(
      userId,
      'arpa-racing-team',
      { description: 'Nueva descripción suficientemente extensa.' },
    );
  });

  it('da de baja lógicamente un equipo con confirmación', async () => {
    teamsService.archive.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete('/api/v1/teams/arpa-racing-team')
      .set('Cookie', 'arpa_session=valid-token')
      .send({ confirmationName: 'ARPA Racing Team' })
      .expect(204);

    expect(teamsService.archive).toHaveBeenCalledWith(
      userId,
      'arpa-racing-team',
      { confirmationName: 'ARPA Racing Team' },
    );
  });

  it('expulsa a un integrante usando el usuario autenticado', async () => {
    const memberId = '66f84cbd29d229e491a23363';
    invitationsService.removeMember.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete(`/api/v1/teams/arpa-racing-team/members/${memberId}`)
      .set('Cookie', 'arpa_session=valid-token')
      .expect(204);

    expect(invitationsService.removeMember).toHaveBeenCalledWith(
      userId,
      'arpa-racing-team',
      memberId,
    );
  });

  it('cancela una invitación usando el usuario autenticado', async () => {
    const invitationId = '66f84cbd29d229e491a23364';
    invitationsService.cancelInvitation.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete(`/api/v1/teams/arpa-racing-team/invitations/${invitationId}`)
      .set('Cookie', 'arpa_session=valid-token')
      .expect(204);

    expect(invitationsService.cancelInvitation).toHaveBeenCalledWith(
      userId,
      'arpa-racing-team',
      invitationId,
    );
  });
});

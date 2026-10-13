import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { StorageService } from '../storage/storage.service';
import { TeamImageKind } from './dto/team-image-kind.dto';
import {
  TeamInvitation,
  TeamInvitationStatus,
} from './schemas/team-invitation.schema';
import {
  Team,
  TeamDiscipline,
  TeamMemberRole,
  TeamPrivacy,
  TeamStatus,
} from './schemas/team.schema';
import { TeamsService } from './teams.service';

describe('TeamsService', () => {
  let service: TeamsService;
  const existsExec = jest.fn();
  const findExec = jest.fn();
  const findOneExec = jest.fn();
  const findQuery = {
    select: jest.fn(),
    sort: jest.fn(),
    exec: findExec,
  };
  findQuery.select.mockReturnValue(findQuery);
  findQuery.sort.mockReturnValue(findQuery);
  const findOneQuery = { select: jest.fn(), exec: findOneExec };
  findOneQuery.select.mockReturnValue(findOneQuery);
  const teamModel = {
    exists: jest.fn(() => ({ exec: existsExec })),
    create: jest.fn(),
    find: jest.fn(() => findQuery),
    findOne: jest.fn(() => findOneQuery),
  };
  const invitationUpdateExec = jest.fn();
  const invitationModel = {
    updateMany: jest.fn(() => ({ exec: invitationUpdateExec })),
  };
  const storageService = {
    uploadPrivate: jest.fn(),
    getSignedUrl: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const ownerId = new Types.ObjectId();
  const team = {
    _id: new Types.ObjectId(),
    name: 'ARPA Racing Team',
    slug: 'arpa-racing-team',
    discipline: TeamDiscipline.KARTING,
    privacy: TeamPrivacy.PRIVATE,
    location: 'Ciudad de México',
    description: 'Equipo enfocado en competencias regionales.',
    ownerId,
    status: TeamStatus.ACTIVE,
    archivedAt: null as Date | null,
    archivedByUserId: null as Types.ObjectId | null,
    members: [],
    photoObjectKeys: [],
    logoObjectKey: null as string | null,
    coverObjectKey: null as string | null,
    createdAt: new Date('2026-10-09T12:00:00.000Z'),
    updatedAt: new Date('2026-10-09T12:00:00.000Z'),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: getModelToken(Team.name), useValue: teamModel },
        {
          provide: getModelToken(TeamInvitation.name),
          useValue: invitationModel,
        },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    service = module.get(TeamsService);
    jest.clearAllMocks();
  });

  it('crea el equipo con el usuario autenticado como owner', async () => {
    existsExec.mockResolvedValue(null);
    teamModel.create.mockResolvedValue(team);

    const result = await service.create(ownerId.toString(), {
      name: team.name,
      discipline: team.discipline,
      privacy: team.privacy,
      location: team.location,
      description: team.description,
    });

    expect(teamModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'arpa-racing-team',
        ownerId: new Types.ObjectId(ownerId.toString()),
      }),
    );
    expect(result.membershipRole).toBe(TeamMemberRole.OWNER);
    expect(result.memberCount).toBe(1);
  });

  it('lista únicamente equipos activos del owner solicitado', async () => {
    findExec.mockResolvedValue([team]);

    const result = await service.listMine(ownerId.toString());

    expect(teamModel.find).toHaveBeenCalledWith({
      status: TeamStatus.ACTIVE,
      $or: [
        { ownerId: new Types.ObjectId(ownerId.toString()) },
        { 'members.userId': new Types.ObjectId(ownerId.toString()) },
      ],
    });
    expect(findQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(result).toHaveLength(1);
  });

  it('no expone un equipo que no pertenece al usuario', async () => {
    findOneExec.mockResolvedValue(null);

    await expect(
      service.getBySlug(new Types.ObjectId().toString(), team.slug),
    ).rejects.toThrow(NotFoundException);
  });

  it('limita los datos de un equipo privado para visitantes', async () => {
    const privateTeam = {
      ...team,
      privacy: TeamPrivacy.PRIVATE,
      members: [],
      logoObjectKey: 'teams/id/logo/logo.webp',
      coverObjectKey: 'teams/id/cover/cover.webp',
      photoObjectKeys: ['teams/id/photos/private.webp'],
    };
    findOneExec.mockResolvedValue(privateTeam);
    storageService.getSignedUrl
      .mockResolvedValueOnce({
        url: 'https://signed.example/logo',
        expiresAt: new Date(),
      })
      .mockResolvedValueOnce({
        url: 'https://signed.example/cover',
        expiresAt: new Date(),
      });

    const result = await service.getBySlug(
      new Types.ObjectId().toString(),
      team.slug,
    );

    expect(result.isPrivateView).toBe(true);
    expect(result.description).toBeNull();
    expect(result.location).toBeNull();
    expect(result.photoUrls).toEqual([]);
    expect(result.logoImageUrl).toContain('/logo');
    expect(result.coverImageUrl).toContain('/cover');
  });

  it('muestra información y fotos de un equipo público al visitante', async () => {
    const publicTeam = {
      ...team,
      privacy: TeamPrivacy.PUBLIC,
      members: [],
      photoObjectKeys: ['teams/id/photos/public.webp'],
      logoObjectKey: null,
      coverObjectKey: null,
    };
    findOneExec.mockResolvedValue(publicTeam);
    storageService.getSignedUrl.mockResolvedValueOnce({
      url: 'https://signed.example/photo',
      expiresAt: new Date(),
    });

    const result = await service.getBySlug(
      new Types.ObjectId().toString(),
      team.slug,
    );

    expect(result.isPrivateView).toBe(false);
    expect(result.description).toBe(team.description);
    expect(result.photoUrls).toEqual(['https://signed.example/photo']);
    expect(result.membershipRole).toBeNull();
  });

  it('permite al owner actualizar la información', async () => {
    findOneExec.mockResolvedValue(team);

    const result = await service.update(ownerId.toString(), team.slug, {
      description: 'Descripción actualizada para el equipo regional.',
    });

    expect(team.save).toHaveBeenCalled();
    expect(result.description).toBe(
      'Descripción actualizada para el equipo regional.',
    );
  });

  it('ignora valores nulos en una actualización parcial', async () => {
    const partialTeam = {
      ...team,
      showMembers: false,
      save: jest.fn(),
    };
    findOneExec.mockResolvedValue(partialTeam);

    await service.update(ownerId.toString(), team.slug, {
      name: null,
      location: null,
      description: null,
      showMembers: true,
    } as unknown as import('./dto/update-team.dto').UpdateTeamDto);

    expect(partialTeam.name).toBe(team.name);
    expect(partialTeam.location).toBe(team.location);
    expect(partialTeam.description).toBe(team.description);
    expect(partialTeam.showMembers).toBe(true);
  });

  it('sincroniza el acceso de visitantes con la privacidad del equipo', async () => {
    const privacyTeam = {
      ...team,
      privacy: TeamPrivacy.PRIVATE,
      allowNonMembers: false,
      showMembers: false,
      save: jest.fn(),
    };
    findOneExec.mockResolvedValue(privacyTeam);

    const result = await service.update(ownerId.toString(), team.slug, {
      allowNonMembers: true,
      showMembers: true,
    });

    expect(privacyTeam.allowNonMembers).toBe(true);
    expect(privacyTeam.showMembers).toBe(true);
    expect(privacyTeam.privacy).toBe(TeamPrivacy.PUBLIC);
    expect(result.isPrivateView).toBe(false);
  });

  it('archiva lógicamente el equipo y cancela invitaciones pendientes', async () => {
    findOneExec.mockResolvedValue(team);
    invitationUpdateExec.mockResolvedValue({ modifiedCount: 2 });

    await service.archive(ownerId.toString(), team.slug, {
      confirmationName: team.name,
    });

    expect(team.status).toBe(TeamStatus.ARCHIVED);
    expect(team.archivedAt).toBeInstanceOf(Date);
    expect(team.save).toHaveBeenCalled();
    expect(invitationModel.updateMany).toHaveBeenCalledWith(
      { teamId: team._id, status: TeamInvitationStatus.PENDING },
      { $set: { status: TeamInvitationStatus.CANCELLED } },
    );
  });

  it('sube fotos privadas y devuelve sus URLs firmadas', async () => {
    const activeTeam = { ...team, photoObjectKeys: [], save: jest.fn() };
    findOneExec.mockResolvedValue(activeTeam);
    storageService.uploadPrivate
      .mockResolvedValueOnce('teams/team-id/photos/one.webp')
      .mockResolvedValueOnce('teams/team-id/photos/two.webp');
    storageService.getSignedUrl
      .mockResolvedValueOnce({
        url: 'https://signed.example/one',
        expiresAt: new Date(),
      })
      .mockResolvedValueOnce({
        url: 'https://signed.example/two',
        expiresAt: new Date(),
      });

    const result = await service.uploadPhotos(ownerId.toString(), team.slug, [
      { buffer: Buffer.from('one'), mimetype: 'image/webp' },
      { buffer: Buffer.from('two'), mimetype: 'image/webp' },
    ] as Express.Multer.File[]);

    expect(storageService.uploadPrivate).toHaveBeenCalledTimes(2);
    expect(activeTeam.photoObjectKeys).toHaveLength(2);
    expect(activeTeam.save).toHaveBeenCalled();
    expect(result.photoUrls).toEqual([
      'https://signed.example/one',
      'https://signed.example/two',
    ]);
  });

  it('sube una portada privada y reemplaza la anterior', async () => {
    const activeTeam = {
      ...team,
      coverObjectKey: 'teams/team-id/cover/old.webp',
      save: jest.fn(),
    };
    findOneExec.mockResolvedValue(activeTeam);
    storageService.uploadPrivate.mockResolvedValue(
      'teams/team-id/cover/new.webp',
    );
    storageService.getSignedUrl.mockResolvedValue({
      url: 'https://signed.example/cover',
      expiresAt: new Date(),
    });

    const result = await service.uploadImage(
      ownerId.toString(),
      team.slug,
      TeamImageKind.COVER,
      {
        buffer: Buffer.from('cover'),
        mimetype: 'image/webp',
      } as Express.Multer.File,
    );

    expect(storageService.uploadPrivate).toHaveBeenCalledWith({
      buffer: expect.any(Buffer),
      contentType: 'image/webp',
      directory: `teams/${team._id}/cover`,
    });
    expect(activeTeam.coverObjectKey).toBe('teams/team-id/cover/new.webp');
    expect(storageService.delete).toHaveBeenCalledWith(
      'teams/team-id/cover/old.webp',
    );
    expect(result.coverImageUrl).toBe('https://signed.example/cover');
  });

  it('rechaza la baja cuando el nombre no coincide exactamente', async () => {
    const activeTeam = { ...team, status: TeamStatus.ACTIVE };
    findOneExec.mockResolvedValue(activeTeam);

    await expect(
      service.archive(ownerId.toString(), team.slug, {
        confirmationName: 'arpa racing team',
      }),
    ).rejects.toThrow(ConflictException);

    expect(activeTeam.save).not.toHaveBeenCalled();
  });
});

import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
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
  const sort = jest.fn(() => ({ exec: findExec }));
  const teamModel = {
    exists: jest.fn(() => ({ exec: existsExec })),
    create: jest.fn(),
    find: jest.fn(() => ({ sort })),
    findOne: jest.fn(() => ({ exec: findOneExec })),
  };
  const invitationUpdateExec = jest.fn();
  const invitationModel = {
    updateMany: jest.fn(() => ({ exec: invitationUpdateExec })),
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
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(result).toHaveLength(1);
  });

  it('no expone un equipo que no pertenece al usuario', async () => {
    findOneExec.mockResolvedValue(null);

    await expect(
      service.getMineBySlug(new Types.ObjectId().toString(), team.slug),
    ).rejects.toThrow(NotFoundException);
  });

  it('permite al owner actualizar la información y las imágenes', async () => {
    findOneExec.mockResolvedValue(team);

    const result = await service.update(ownerId.toString(), team.slug, {
      description: 'Descripción actualizada para el equipo regional.',
      logoImageUrl: 'https://cdn.example.com/logo.jpg',
    });

    expect(team.save).toHaveBeenCalled();
    expect(result.description).toBe(
      'Descripción actualizada para el equipo regional.',
    );
    expect(result.logoImageUrl).toBe('https://cdn.example.com/logo.jpg');
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

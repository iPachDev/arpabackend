import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
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
    createdAt: new Date('2026-10-09T12:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: getModelToken(Team.name), useValue: teamModel },
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
});

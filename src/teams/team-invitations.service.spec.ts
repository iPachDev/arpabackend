import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { EmailService } from '../email/email.service';
import { User } from '../users/schemas/user.schema';
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
import { TeamInvitationsService } from './team-invitations.service';

describe('TeamInvitationsService', () => {
  let service: TeamInvitationsService;
  const exec = jest.fn();
  const teamFindOneExec = jest.fn();
  const teamFindByIdExec = jest.fn();
  const invitationFindOneExec = jest.fn();
  const userFindByIdExec = jest.fn();
  const userFindOneExec = jest.fn();
  const teamModel = {
    findOne: jest.fn(() => ({ exec: teamFindOneExec })),
    findById: jest.fn(() => ({ exec: teamFindByIdExec })),
    updateOne: jest.fn(() => ({ exec })),
  };
  const invitationModel = {
    findOne: jest.fn(() => ({ exec: invitationFindOneExec })),
    create: jest.fn(),
    updateMany: jest.fn(() => ({ exec })),
  };
  const userModel = {
    findById: jest.fn(() => ({ exec: userFindByIdExec })),
    findOne: jest.fn(() => ({ exec: userFindOneExec })),
  };
  const emailService = { sendTeamInvitation: jest.fn() };
  const configService = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'FRONTEND_URL') return 'http://localhost:3000';
      if (key === 'TEAM_INVITATION_TTL_DAYS') return '7';
      return fallback;
    }),
  };

  const ownerId = new Types.ObjectId();
  const team = {
    _id: new Types.ObjectId(),
    name: 'ARPA Racing Team',
    slug: 'arpa-racing-team',
    discipline: TeamDiscipline.KARTING,
    privacy: TeamPrivacy.PRIVATE,
    location: 'Ciudad de México',
    description: 'Equipo de karting.',
    ownerId,
    status: TeamStatus.ACTIVE,
    members: [],
    createdAt: new Date(),
  };
  const inviter = {
    _id: ownerId,
    name: 'Fernando Pacheco',
    email: 'fernando@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamInvitationsService,
        { provide: getModelToken(Team.name), useValue: teamModel },
        {
          provide: getModelToken(TeamInvitation.name),
          useValue: invitationModel,
        },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(TeamInvitationsService);
    jest.clearAllMocks();
    exec.mockResolvedValue({ modifiedCount: 1 });
  });

  it('guarda solamente el hash y envía un enlace de un solo uso', async () => {
    teamFindOneExec.mockResolvedValue(team);
    userFindByIdExec.mockResolvedValue(inviter);
    userFindOneExec.mockResolvedValue(null);
    invitationFindOneExec.mockResolvedValue(null);
    emailService.sendTeamInvitation.mockResolvedValue('resend-email-id');
    invitationModel.create.mockImplementation(async (data) => ({
      _id: new Types.ObjectId(),
      ...data,
      status: TeamInvitationStatus.PENDING,
      createdAt: new Date(),
      resendEmailId: null,
      save: jest.fn(),
    }));

    const result = await service.invite(ownerId.toString(), team.slug, {
      invitedName: 'Mariana López',
      email: 'mariana@example.com',
      sportsRole: 'Piloto',
      memberRole: TeamMemberRole.READER,
    });

    const stored = invitationModel.create.mock.calls[0][0];
    const email = emailService.sendTeamInvitation.mock.calls[0][0];
    expect(stored.tokenHash).toHaveLength(64);
    expect(email.invitationUrl).toMatch(
      /^http:\/\/localhost:3000\/invitations\/[A-Za-z0-9_-]{43}$/,
    );
    expect(email.invitationUrl).not.toContain(stored.tokenHash);
    expect(result.status).toBe(TeamInvitationStatus.PENDING);
  });

  it('agrega al usuario y conserva la aceptación en el historial', async () => {
    const invitedUserId = new Types.ObjectId();
    const invitation = {
      _id: new Types.ObjectId(),
      teamId: team._id,
      email: 'mariana@example.com',
      invitedName: 'Mariana López',
      sportsRole: 'Piloto',
      memberRole: TeamMemberRole.READER,
      status: TeamInvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 60_000),
      acceptedByUserId: null as Types.ObjectId | null,
      acceptedAt: null as Date | null,
      save: jest.fn(),
    };
    invitationFindOneExec.mockResolvedValue(invitation);
    teamFindByIdExec.mockResolvedValue(team);

    const result = await service.accept(
      'opaque-token',
      invitedUserId.toString(),
      invitation.email,
    );

    expect(teamModel.updateOne).toHaveBeenCalledWith(
      { _id: team._id, 'members.userId': { $ne: invitedUserId } },
      {
        $push: {
          members: expect.objectContaining({
            userId: invitedUserId,
            role: TeamMemberRole.READER,
            sportsRole: 'Piloto',
          }),
        },
      },
    );
    expect(invitation.status).toBe(TeamInvitationStatus.ACCEPTED);
    expect(invitation.acceptedByUserId).toEqual(invitedUserId);
    expect(invitation.save).toHaveBeenCalled();
    expect(result.teamSlug).toBe(team.slug);
  });

  it('impide aceptar con un correo diferente', async () => {
    invitationFindOneExec.mockResolvedValue({
      teamId: team._id,
      email: 'mariana@example.com',
      status: TeamInvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 60_000),
      save: jest.fn(),
    });

    await expect(
      service.accept(
        'opaque-token',
        new Types.ObjectId().toString(),
        'otro@example.com',
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(teamModel.updateOne).not.toHaveBeenCalled();
  });

  it('no expone invitaciones de un equipo archivado', async () => {
    invitationFindOneExec.mockResolvedValue({
      teamId: team._id,
      email: 'mariana@example.com',
      status: TeamInvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 60_000),
      save: jest.fn(),
    });
    teamFindByIdExec.mockResolvedValue({
      ...team,
      status: TeamStatus.ARCHIVED,
    });

    await expect(service.preview('opaque-token')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('permite que un editor expulse a otro integrante', async () => {
    const editorId = new Types.ObjectId();
    const memberId = new Types.ObjectId();
    teamFindOneExec.mockResolvedValue({
      ...team,
      members: [
        {
          userId: editorId,
          role: TeamMemberRole.EDITOR,
          sportsRole: 'Ingeniero de pista',
          joinedAt: new Date(),
        },
        {
          userId: memberId,
          role: TeamMemberRole.READER,
          sportsRole: 'Piloto',
          joinedAt: new Date(),
        },
      ],
    });

    await service.removeMember(
      editorId.toString(),
      team.slug,
      memberId.toString(),
    );

    expect(teamModel.updateOne).toHaveBeenCalledWith(
      { _id: team._id, ownerId: { $ne: memberId } },
      { $pull: { members: { userId: memberId } } },
    );
  });

  it('nunca permite expulsar al owner', async () => {
    teamFindOneExec.mockResolvedValue(team);

    await expect(
      service.removeMember(ownerId.toString(), team.slug, ownerId.toString()),
    ).rejects.toThrow(ForbiddenException);

    expect(teamModel.updateOne).not.toHaveBeenCalled();
  });

  it('impide que un editor se expulse a sí mismo', async () => {
    const editorId = new Types.ObjectId();
    teamFindOneExec.mockResolvedValue({
      ...team,
      members: [
        {
          userId: editorId,
          role: TeamMemberRole.EDITOR,
          sportsRole: 'Mecánico',
          joinedAt: new Date(),
        },
      ],
    });

    await expect(
      service.removeMember(editorId.toString(), team.slug, editorId.toString()),
    ).rejects.toThrow(ForbiddenException);

    expect(teamModel.updateOne).not.toHaveBeenCalled();
  });

  it('impide que un lector administre integrantes', async () => {
    teamFindOneExec.mockResolvedValue(null);

    await expect(
      service.removeMember(
        new Types.ObjectId().toString(),
        team.slug,
        new Types.ObjectId().toString(),
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(teamModel.updateOne).not.toHaveBeenCalled();
  });

  it('permite cancelar una invitación pendiente', async () => {
    const invitation = {
      _id: new Types.ObjectId(),
      teamId: team._id,
      status: TeamInvitationStatus.PENDING,
      save: jest.fn(),
    };
    teamFindOneExec.mockResolvedValue(team);
    invitationFindOneExec.mockResolvedValue(invitation);

    await service.cancelInvitation(
      ownerId.toString(),
      team.slug,
      invitation._id.toString(),
    );

    expect(invitation.status).toBe(TeamInvitationStatus.CANCELLED);
    expect(invitation.save).toHaveBeenCalled();
  });
});

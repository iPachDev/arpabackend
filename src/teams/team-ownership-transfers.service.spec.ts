import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { EmailService } from '../email/email.service';
import { User, UserStatus } from '../users/schemas/user.schema';
import {
  TeamOwnershipTransfer,
  TeamOwnershipTransferStatus,
} from './schemas/team-ownership-transfer.schema';
import { Team, TeamStatus } from './schemas/team.schema';
import { TeamOwnershipTransfersService } from './team-ownership-transfers.service';

describe('TeamOwnershipTransfersService', () => {
  let service: TeamOwnershipTransfersService;
  const teamFindExec = jest.fn();
  const teamByIdExec = jest.fn();
  const teamUpdateExec = jest.fn();
  const transferFindExec = jest.fn();
  const transferUpdateExec = jest.fn();
  const userByIdExec = jest.fn();
  const userFindExec = jest.fn();
  const teamModel = {
    findOne: jest.fn(() => ({ exec: teamFindExec })),
    findById: jest.fn(() => ({ exec: teamByIdExec })),
    updateOne: jest.fn(() => ({ exec: teamUpdateExec })),
  };
  const transferModel = {
    findOne: jest.fn(() => ({ exec: transferFindExec })),
    updateMany: jest.fn(() => ({ exec: transferUpdateExec })),
    create: jest.fn(),
  };
  const userModel = {
    findById: jest.fn(() => ({ exec: userByIdExec })),
    findOne: jest.fn(() => ({ exec: userFindExec })),
  };
  const emailService = { sendTeamOwnershipTransfer: jest.fn() };
  const ownerId = new Types.ObjectId();
  const newOwnerId = new Types.ObjectId();
  const team = {
    _id: new Types.ObjectId(),
    slug: 'arpa-racing-team',
    name: 'ARPA Racing Team',
    ownerId,
    status: TeamStatus.ACTIVE,
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TeamOwnershipTransfersService,
        { provide: getModelToken(Team.name), useValue: teamModel },
        {
          provide: getModelToken(TeamOwnershipTransfer.name),
          useValue: transferModel,
        },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: EmailService, useValue: emailService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key, fallback) => fallback) },
        },
      ],
    }).compile();
    service = module.get(TeamOwnershipTransfersService);
    jest.clearAllMocks();
    teamFindExec.mockResolvedValue(team);
    transferUpdateExec.mockResolvedValue({ modifiedCount: 0 });
    transferFindExec.mockResolvedValue(null);
    userByIdExec.mockResolvedValue({ name: 'Owner actual' });
    userFindExec.mockResolvedValue({
      _id: newOwnerId,
      name: 'Nueva owner',
      email: 'nueva@example.com',
      status: UserStatus.ACTIVE,
    });
  });

  it('envía la invitación sin cambiar la propiedad', async () => {
    const transfer = {
      _id: new Types.ObjectId(),
      email: 'nueva@example.com',
      status: TeamOwnershipTransferStatus.PENDING,
      expiresAt: new Date(Date.now() + 86_400_000),
      resendEmailId: null,
      save: jest.fn(),
    };
    transferModel.create.mockResolvedValue(transfer);
    emailService.sendTeamOwnershipTransfer.mockResolvedValue('email-id');

    const result = await service.invite(ownerId.toString(), team.slug, {
      email: transfer.email,
    });

    expect(transferModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: team._id,
        fromUserId: ownerId,
        toUserId: newOwnerId,
      }),
    );
    expect(emailService.sendTeamOwnershipTransfer).toHaveBeenCalled();
    expect(teamModel.updateOne).not.toHaveBeenCalled();
    expect(result.status).toBe(TeamOwnershipTransferStatus.PENDING);
  });

  it('transfiere la propiedad y retira al nuevo owner de members', async () => {
    const transfer = {
      teamId: team._id,
      fromUserId: ownerId,
      toUserId: newOwnerId,
      email: 'nueva@example.com',
      status: TeamOwnershipTransferStatus.PENDING,
      expiresAt: new Date(Date.now() + 86_400_000),
      acceptedAt: null as Date | null,
      save: jest.fn(),
    };
    transferFindExec.mockResolvedValue(transfer);
    teamByIdExec.mockResolvedValue(team);
    teamUpdateExec.mockResolvedValue({ modifiedCount: 1 });

    const result = await service.accept(
      'opaque-token',
      newOwnerId.toString(),
      transfer.email,
    );

    expect(teamModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId }),
      {
        $set: { ownerId: newOwnerId },
        $pull: { members: { userId: newOwnerId } },
      },
    );
    expect(transfer.status).toBe(TeamOwnershipTransferStatus.ACCEPTED);
    expect(transfer.acceptedAt).toBeInstanceOf(Date);
    expect(result.teamSlug).toBe(team.slug);
  });

  it('rechaza la aceptación desde otra cuenta', async () => {
    transferFindExec.mockResolvedValue({
      toUserId: newOwnerId,
      email: 'nueva@example.com',
      status: TeamOwnershipTransferStatus.PENDING,
      expiresAt: new Date(Date.now() + 86_400_000),
      save: jest.fn(),
    });

    await expect(
      service.accept(
        'opaque-token',
        new Types.ObjectId().toString(),
        'otra@example.com',
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});

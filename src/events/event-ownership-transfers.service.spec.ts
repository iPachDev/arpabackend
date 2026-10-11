import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { EmailService } from '../email/email.service';
import { User, UserStatus } from '../users/schemas/user.schema';
import { EventOwnershipTransfersService } from './event-ownership-transfers.service';
import {
  EventOwnershipTransfer,
  EventOwnershipTransferStatus,
} from './schemas/event-ownership-transfer.schema';
import { Event, EventStatus } from './schemas/event.schema';

describe('EventOwnershipTransfersService', () => {
  let service: EventOwnershipTransfersService;
  const eventFindExec = jest.fn();
  const eventByIdExec = jest.fn();
  const eventUpdateExec = jest.fn();
  const transferFindExec = jest.fn();
  const transferUpdateExec = jest.fn();
  const userByIdExec = jest.fn();
  const userFindExec = jest.fn();
  const eventModel = {
    findOne: jest.fn(() => ({ exec: eventFindExec })),
    findById: jest.fn(() => ({ exec: eventByIdExec })),
    updateOne: jest.fn(() => ({ exec: eventUpdateExec })),
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
  const emailService = { sendEventOwnershipTransfer: jest.fn() };
  const ownerId = new Types.ObjectId();
  const newOwnerId = new Types.ObjectId();
  const event = {
    _id: new Types.ObjectId(),
    slug: 'copa-arpa',
    title: 'Copa ARPA',
    createdByUserId: ownerId,
    status: EventStatus.PUBLISHED,
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EventOwnershipTransfersService,
        { provide: getModelToken(Event.name), useValue: eventModel },
        {
          provide: getModelToken(EventOwnershipTransfer.name),
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
    service = module.get(EventOwnershipTransfersService);
    jest.clearAllMocks();
    eventFindExec.mockResolvedValue(event);
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

  it('crea la invitación y envía el correo sin cambiar la propiedad', async () => {
    const transfer = {
      _id: new Types.ObjectId(),
      email: 'nueva@example.com',
      status: EventOwnershipTransferStatus.PENDING,
      expiresAt: new Date(Date.now() + 86_400_000),
      resendEmailId: null,
      save: jest.fn(),
    };
    transferModel.create.mockResolvedValue(transfer);
    emailService.sendEventOwnershipTransfer.mockResolvedValue('email-id');

    const result = await service.invite(ownerId.toString(), event.slug, {
      email: 'nueva@example.com',
    });

    expect(transferModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: event._id,
        fromUserId: ownerId,
        toUserId: newOwnerId,
      }),
    );
    expect(emailService.sendEventOwnershipTransfer).toHaveBeenCalled();
    expect(eventModel.updateOne).not.toHaveBeenCalled();
    expect(result.status).toBe(EventOwnershipTransferStatus.PENDING);
  });

  it('transfiere la propiedad al aceptar con la cuenta invitada', async () => {
    const transfer = {
      eventId: event._id,
      fromUserId: ownerId,
      toUserId: newOwnerId,
      email: 'nueva@example.com',
      status: EventOwnershipTransferStatus.PENDING,
      expiresAt: new Date(Date.now() + 86_400_000),
      acceptedAt: null as Date | null,
      save: jest.fn(),
    };
    transferFindExec.mockResolvedValue(transfer);
    eventByIdExec.mockResolvedValue(event);
    eventUpdateExec.mockResolvedValue({ modifiedCount: 1 });

    const result = await service.accept(
      'opaque-token',
      newOwnerId.toString(),
      transfer.email,
    );

    expect(eventModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ createdByUserId: ownerId }),
      { $set: { createdByUserId: newOwnerId } },
    );
    expect(transfer.status).toBe(EventOwnershipTransferStatus.ACCEPTED);
    expect(transfer.acceptedAt).toBeInstanceOf(Date);
    expect(result.eventSlug).toBe(event.slug);
  });

  it('rechaza la aceptación desde otra cuenta', async () => {
    transferFindExec.mockResolvedValue({
      toUserId: newOwnerId,
      email: 'nueva@example.com',
      status: EventOwnershipTransferStatus.PENDING,
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

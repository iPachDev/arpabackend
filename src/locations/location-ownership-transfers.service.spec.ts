import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { EmailService } from '../email/email.service';
import { User, UserStatus } from '../users/schemas/user.schema';
import { LocationOwnershipTransfersService } from './location-ownership-transfers.service';
import {
  LocationOwnershipTransfer,
  LocationOwnershipTransferStatus,
} from './schemas/location-ownership-transfer.schema';
import { Location, LocationStatus } from './schemas/location.schema';

describe('LocationOwnershipTransfersService', () => {
  let service: LocationOwnershipTransfersService;
  const locationFind = jest.fn(),
    locationById = jest.fn(),
    locationUpdate = jest.fn(),
    transferFind = jest.fn(),
    transferUpdate = jest.fn(),
    userById = jest.fn(),
    userFind = jest.fn();
  const locationModel = {
    findOne: jest.fn(() => ({ exec: locationFind })),
    findById: jest.fn(() => ({ exec: locationById })),
    updateOne: jest.fn(() => ({ exec: locationUpdate })),
  };
  const transferModel = {
    findOne: jest.fn(() => ({ exec: transferFind })),
    updateMany: jest.fn(() => ({ exec: transferUpdate })),
    create: jest.fn(),
  };
  const userModel = {
    findById: jest.fn(() => ({ exec: userById })),
    findOne: jest.fn(() => ({ exec: userFind })),
  };
  const emailService = { sendLocationOwnershipTransfer: jest.fn() };
  const ownerId = new Types.ObjectId(),
    newOwnerId = new Types.ObjectId();
  const location = {
    _id: new Types.ObjectId(),
    slug: 'pista-arpa',
    name: 'Pista ARPA',
    ownerId,
    status: LocationStatus.ACTIVE,
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LocationOwnershipTransfersService,
        { provide: getModelToken(Location.name), useValue: locationModel },
        {
          provide: getModelToken(LocationOwnershipTransfer.name),
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
    service = module.get(LocationOwnershipTransfersService);
    jest.clearAllMocks();
    locationFind.mockResolvedValue(location);
    transferFind.mockResolvedValue(null);
    transferUpdate.mockResolvedValue({});
    userById.mockResolvedValue({ name: 'Owner' });
    userFind.mockResolvedValue({
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
      status: LocationOwnershipTransferStatus.PENDING,
      expiresAt: new Date(Date.now() + 86400000),
      resendEmailId: null,
      save: jest.fn(),
    };
    transferModel.create.mockResolvedValue(transfer);
    emailService.sendLocationOwnershipTransfer.mockResolvedValue('email-id');
    await service.invite(ownerId.toString(), location.slug, {
      email: transfer.email,
    });
    expect(emailService.sendLocationOwnershipTransfer).toHaveBeenCalled();
    expect(locationModel.updateOne).not.toHaveBeenCalled();
  });

  it('cambia la propiedad al aceptar con la cuenta invitada', async () => {
    const transfer = {
      locationId: location._id,
      fromUserId: ownerId,
      toUserId: newOwnerId,
      email: 'nueva@example.com',
      status: LocationOwnershipTransferStatus.PENDING,
      expiresAt: new Date(Date.now() + 86400000),
      acceptedAt: null as Date | null,
      save: jest.fn(),
    };
    transferFind.mockResolvedValue(transfer);
    locationById.mockResolvedValue(location);
    locationUpdate.mockResolvedValue({ modifiedCount: 1 });
    await service.accept('token', newOwnerId.toString(), transfer.email);
    expect(locationModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId }),
      { $set: { ownerId: newOwnerId } },
    );
    expect(transfer.status).toBe(LocationOwnershipTransferStatus.ACCEPTED);
  });

  it('rechaza otra cuenta', async () => {
    transferFind.mockResolvedValue({
      toUserId: newOwnerId,
      email: 'nueva@example.com',
      status: LocationOwnershipTransferStatus.PENDING,
      expiresAt: new Date(Date.now() + 86400000),
      save: jest.fn(),
    });
    await expect(
      service.accept(
        'token',
        new Types.ObjectId().toString(),
        'otra@example.com',
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});

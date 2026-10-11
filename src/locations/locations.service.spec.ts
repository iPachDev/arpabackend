import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import {
  LocationOwnershipTransfer,
  LocationOwnershipTransferStatus,
} from './schemas/location-ownership-transfer.schema';
import {
  Location,
  LocationDiscipline,
  LocationStatus,
} from './schemas/location.schema';
import { LocationsService } from './locations.service';

describe('LocationsService', () => {
  let service: LocationsService;
  const findExec = jest.fn();
  const exists = jest.fn();
  const updateExec = jest.fn();
  const model = {
    create: jest.fn(),
    exists,
    findOne: jest.fn(() => ({ exec: findExec })),
    find: jest.fn(() => ({ sort: () => ({ exec: findExec }) })),
  };
  const transferModel = { updateMany: jest.fn(() => ({ exec: updateExec })) };
  const ownerId = new Types.ObjectId();
  const location = {
    _id: new Types.ObjectId(),
    slug: 'pista-arpa',
    name: 'Pista ARPA',
    business: 'ARPA',
    discipline: LocationDiscipline.KARTING,
    address: 'Av. Ejemplo 100',
    city: 'México',
    description: 'Circuito de pruebas de ARPA.',
    coverImageUrl: null,
    circuitMapImageUrl: null,
    photoUrls: [],
    ownerId,
    status: LocationStatus.ACTIVE,
    archivedAt: null,
    archivedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: getModelToken(Location.name), useValue: model },
        {
          provide: getModelToken(LocationOwnershipTransfer.name),
          useValue: transferModel,
        },
      ],
    }).compile();
    service = module.get(LocationsService);
    jest.clearAllMocks();
    location.status = LocationStatus.ACTIVE;
    exists.mockResolvedValue(null);
    updateExec.mockResolvedValue({ modifiedCount: 0 });
  });

  it('crea la ubicación con el usuario como propietario', async () => {
    model.create.mockResolvedValue(location);
    const result = await service.create(ownerId.toString(), {
      name: location.name,
      business: location.business,
      discipline: location.discipline,
      address: location.address,
      city: location.city,
      description: location.description,
    });
    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'pista-arpa', ownerId }),
    );
    expect(result.canEdit).toBe(true);
  });

  it('no permite consultar una ubicación ajena', async () => {
    findExec.mockResolvedValue(location);
    await expect(
      service.getBySlug(new Types.ObjectId().toString(), location.slug),
    ).rejects.toThrow(NotFoundException);
  });

  it('da de baja lógicamente y cancela transferencias', async () => {
    findExec.mockResolvedValue(location);
    await service.archive(ownerId.toString(), location.slug, {
      confirmationName: location.name,
    });
    expect(location.status).toBe(LocationStatus.ARCHIVED);
    expect(transferModel.updateMany).toHaveBeenCalledWith(
      {
        locationId: location._id,
        status: LocationOwnershipTransferStatus.PENDING,
      },
      { $set: { status: LocationOwnershipTransferStatus.CANCELLED } },
    );
  });

  it('rechaza una confirmación incorrecta', async () => {
    findExec.mockResolvedValue(location);
    await expect(
      service.archive(ownerId.toString(), location.slug, {
        confirmationName: 'Otra',
      }),
    ).rejects.toThrow(ConflictException);
  });
});

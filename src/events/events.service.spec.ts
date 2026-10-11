import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import {
  EventRegistration,
  EventRegistrationStatus,
} from './schemas/event-registration.schema';
import {
  Event,
  EventDiscipline,
  EventStatus,
  EventType,
} from './schemas/event.schema';
import {
  EventOwnershipTransfer,
  EventOwnershipTransferStatus,
} from './schemas/event-ownership-transfer.schema';
import { EventsService } from './events.service';

describe('EventsService', () => {
  let service: EventsService;
  const eventExec = jest.fn();
  const existsExec = jest.fn();
  const countExec = jest.fn();
  const registrationExistsExec = jest.fn();
  const sort = jest.fn(() => ({ exec: eventExec }));
  const eventModel = {
    create: jest.fn(),
    exists: jest.fn(() => ({ exec: existsExec })),
    find: jest.fn(() => ({ sort })),
    findOne: jest.fn(() => ({ exec: eventExec })),
  };
  const registrationModel = {
    countDocuments: jest.fn(() => ({ exec: countExec })),
    exists: jest.fn(() => ({ exec: registrationExistsExec })),
  };
  const transferUpdateExec = jest.fn();
  const transferModel = {
    updateMany: jest.fn(() => ({ exec: transferUpdateExec })),
  };
  const userId = new Types.ObjectId();
  const event = {
    _id: new Types.ObjectId(),
    id: '',
    slug: 'copa-arpa',
    title: 'Copa ARPA',
    type: EventType.COMPETITION,
    discipline: EventDiscipline.KARTING,
    description: 'Competencia regional de karting para todas las categorías.',
    startsAt: new Date('2026-12-10T15:00:00.000Z'),
    endsAt: new Date('2026-12-10T20:00:00.000Z'),
    sessions: [
      {
        name: 'Fecha #1',
        startsAt: new Date('2026-12-10T15:00:00.000Z'),
        endsAt: new Date('2026-12-10T20:00:00.000Z'),
        location: null,
      },
    ],
    registrationDeadline: new Date('2026-12-09T23:00:00.000Z'),
    location: null,
    maxParticipants: 50,
    imageUrl: null,
    createdByUserId: userId,
    status: EventStatus.PUBLISHED,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
  };
  event.id = event._id.toString();

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getModelToken(Event.name), useValue: eventModel },
        {
          provide: getModelToken(EventRegistration.name),
          useValue: registrationModel,
        },
        {
          provide: getModelToken(EventOwnershipTransfer.name),
          useValue: transferModel,
        },
      ],
    }).compile();
    service = module.get(EventsService);
    jest.clearAllMocks();
    countExec.mockResolvedValue(0);
    registrationExistsExec.mockResolvedValue(null);
    transferUpdateExec.mockResolvedValue({ modifiedCount: 0 });
    event.status = EventStatus.PUBLISHED;
  });

  it('crea un evento con slug y propietario', async () => {
    existsExec.mockResolvedValue(null);
    eventModel.create.mockResolvedValue(event);

    const result = await service.create(userId.toString(), {
      title: event.title,
      type: event.type,
      discipline: event.discipline,
      description: event.description,
      sessions: event.sessions,
      registrationDeadline: event.registrationDeadline,
      maxParticipants: event.maxParticipants,
      imageUrl: null,
    });

    expect(eventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'copa-arpa',
        createdByUserId: userId,
      }),
    );
    expect(result.canEdit).toBe(true);
  });

  it('rechaza un rango de fechas inválido', async () => {
    await expect(
      service.create(userId.toString(), {
        title: event.title,
        type: event.type,
        discipline: event.discipline,
        description: event.description,
        sessions: [
          {
            name: 'Fecha #1',
            startsAt: event.endsAt,
            endsAt: event.startsAt,
            location: null,
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('ordena varias fechas y conserva el final más tardío', async () => {
    existsExec.mockResolvedValue(null);
    eventModel.create.mockResolvedValue(event);
    const first = {
      name: 'Clasificación',
      startsAt: new Date('2026-12-10T15:00:00.000Z'),
      endsAt: new Date('2026-12-10T23:00:00.000Z'),
      location: null,
    };
    const second = {
      name: 'Final',
      startsAt: new Date('2026-12-11T15:00:00.000Z'),
      endsAt: new Date('2026-12-11T20:00:00.000Z'),
      location: null,
    };

    await service.create(userId.toString(), {
      title: event.title,
      type: event.type,
      discipline: event.discipline,
      description: event.description,
      sessions: [second, first],
    });

    expect(eventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sessions: [first, second],
        startsAt: first.startsAt,
        endsAt: second.endsAt,
      }),
    );
  });

  it('no permite editar un evento ajeno', async () => {
    eventExec.mockResolvedValue(null);
    await expect(
      service.update(new Types.ObjectId().toString(), event.slug, {
        title: 'Otro nombre',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('lista solo eventos publicados y vigentes', async () => {
    eventExec.mockResolvedValue([event]);
    const result = await service.listPublished(userId.toString());
    expect(eventModel.find).toHaveBeenCalledWith({
      status: EventStatus.PUBLISHED,
      endsAt: { $gte: expect.any(Date) },
    });
    expect(result).toHaveLength(1);
    expect(registrationModel.countDocuments).toHaveBeenCalledWith({
      eventId: event._id,
      status: EventRegistrationStatus.REGISTERED,
    });
  });

  it('da de baja lógicamente un evento y cancela transferencias', async () => {
    eventExec.mockResolvedValue(event);

    await service.archive(userId.toString(), event.slug, {
      confirmationTitle: event.title,
    });

    expect(event.status).toBe(EventStatus.ARCHIVED);
    expect(event.save).toHaveBeenCalled();
    expect(transferModel.updateMany).toHaveBeenCalledWith(
      {
        eventId: event._id,
        status: EventOwnershipTransferStatus.PENDING,
      },
      { $set: { status: EventOwnershipTransferStatus.CANCELLED } },
    );
  });

  it('rechaza una confirmación de baja incorrecta', async () => {
    eventExec.mockResolvedValue(event);
    await expect(
      service.archive(userId.toString(), event.slug, {
        confirmationTitle: 'Otro evento',
      }),
    ).rejects.toThrow('El nombre de confirmación no coincide');
  });
});

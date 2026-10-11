import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service';
import { EventRegistrationsService } from './event-registrations.service';
import { EventsService } from './events.service';
import {
  EventRegistration,
  EventRegistrationStatus,
} from './schemas/event-registration.schema';
import { Event, EventStatus } from './schemas/event.schema';

describe('EventRegistrationsService', () => {
  let service: EventRegistrationsService;
  const registrationExec = jest.fn();
  const countExec = jest.fn();
  const eventExec = jest.fn();
  const registrationModel = {
    findOne: jest.fn(() => ({ exec: registrationExec })),
    countDocuments: jest.fn(() => ({ exec: countExec })),
    create: jest.fn(),
    find: jest.fn(() => ({
      sort: jest.fn(() => ({ exec: registrationExec })),
    })),
  };
  const eventModel = {
    find: jest.fn(() => ({ exec: eventExec })),
  };
  const eventsService = {
    findPublishedBySlug: jest.fn(),
    present: jest.fn(),
  };
  const notificationsService = {
    notifyEventRegistration: jest.fn(),
  };
  const userId = new Types.ObjectId();
  const event = {
    _id: new Types.ObjectId(),
    id: '',
    slug: 'copa-arpa',
    startsAt: new Date(Date.now() + 86_400_000),
    registrationDeadline: new Date(Date.now() + 43_200_000),
    maxParticipants: 20,
    status: EventStatus.PUBLISHED,
  };
  event.id = event._id.toString();

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EventRegistrationsService,
        { provide: getModelToken(Event.name), useValue: eventModel },
        {
          provide: getModelToken(EventRegistration.name),
          useValue: registrationModel,
        },
        { provide: EventsService, useValue: eventsService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();
    service = module.get(EventRegistrationsService);
    jest.clearAllMocks();
    eventsService.findPublishedBySlug.mockResolvedValue(event);
    eventsService.present.mockResolvedValue({ slug: event.slug });
    countExec.mockResolvedValue(0);
  });

  it('crea una inscripción para el usuario autenticado', async () => {
    registrationExec.mockResolvedValue(null);
    const registration = {
      _id: new Types.ObjectId(),
      status: EventRegistrationStatus.REGISTERED,
      registeredAt: new Date(),
    };
    registrationModel.create.mockResolvedValue(registration);

    const result = await service.register(userId.toString(), event.slug);

    expect(registrationModel.create).toHaveBeenCalledWith({
      eventId: event._id,
      userId,
    });
    expect(result.status).toBe(EventRegistrationStatus.REGISTERED);
    expect(notificationsService.notifyEventRegistration).toHaveBeenCalledWith(
      userId.toString(),
      event,
      'registered',
    );
  });

  it('evita inscripciones duplicadas', async () => {
    registrationExec.mockResolvedValue({
      status: EventRegistrationStatus.REGISTERED,
    });
    await expect(
      service.register(userId.toString(), event.slug),
    ).rejects.toThrow(ConflictException);
  });

  it('convierte una colisión simultánea en conflicto controlado', async () => {
    registrationExec.mockResolvedValue(null);
    registrationModel.create.mockRejectedValue({ code: 11000 });

    await expect(
      service.register(userId.toString(), event.slug),
    ).rejects.toThrow(ConflictException);
  });

  it('cancela lógicamente una inscripción', async () => {
    const registration = {
      status: EventRegistrationStatus.REGISTERED,
      cancelledAt: null as Date | null,
      save: jest.fn(),
    };
    registrationExec.mockResolvedValue(registration);

    await service.cancel(userId.toString(), event.slug);

    expect(registration.status).toBe(EventRegistrationStatus.CANCELLED);
    expect(registration.cancelledAt).toBeInstanceOf(Date);
    expect(registration.save).toHaveBeenCalled();
    expect(notificationsService.notifyEventRegistration).toHaveBeenCalledWith(
      userId.toString(),
      event,
      'cancelled',
    );
  });

  it('rechaza cancelar una inscripción inexistente', async () => {
    registrationExec.mockResolvedValue(null);
    await expect(service.cancel(userId.toString(), event.slug)).rejects.toThrow(
      NotFoundException,
    );
  });
});

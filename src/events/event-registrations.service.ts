import {
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service';
import { EventRegistrationResponseDto } from './dto/event-registration-response.dto';
import { EventsService } from './events.service';
import {
  EventRegistration,
  EventRegistrationDocument,
  EventRegistrationStatus,
} from './schemas/event-registration.schema';
import { Event, EventDocument, EventStatus } from './schemas/event.schema';

@Injectable()
export class EventRegistrationsService {
  constructor(
    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,
    @InjectModel(EventRegistration.name)
    private readonly registrationModel: Model<EventRegistrationDocument>,
    private readonly eventsService: EventsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async register(
    userId: string,
    slug: string,
  ): Promise<EventRegistrationResponseDto> {
    const event = await this.eventsService.findPublishedBySlug(slug);
    const now = new Date();
    if (event.startsAt.getTime() <= now.getTime()) {
      throw new GoneException('El evento ya inició.');
    }
    if (
      event.registrationDeadline &&
      event.registrationDeadline.getTime() < now.getTime()
    ) {
      throw new GoneException('Las inscripciones ya cerraron.');
    }

    const userObjectId = new Types.ObjectId(userId);
    const existing = await this.registrationModel
      .findOne({ eventId: event._id, userId: userObjectId })
      .exec();
    if (existing?.status === EventRegistrationStatus.REGISTERED) {
      throw new ConflictException('Ya estás inscrito en este evento.');
    }

    if (event.maxParticipants) {
      const count = await this.registrationModel
        .countDocuments({
          eventId: event._id,
          status: EventRegistrationStatus.REGISTERED,
        })
        .exec();
      if (count >= event.maxParticipants) {
        throw new ConflictException('El evento alcanzó su cupo máximo.');
      }
    }

    let registration: EventRegistrationDocument;
    if (existing) {
      registration = await this.reactivate(existing);
    } else {
      try {
        registration = await this.registrationModel.create({
          eventId: event._id,
          userId: userObjectId,
        });
      } catch (error: unknown) {
        if (this.isDuplicateKeyError(error)) {
          throw new ConflictException('Ya estás inscrito en este evento.');
        }
        throw error;
      }
    }
    await this.notificationsService.notifyEventRegistration(
      userId,
      event,
      'registered',
    );
    return this.toResponse(registration, event, userId);
  }

  async cancel(userId: string, slug: string): Promise<void> {
    const event = await this.eventsService.findPublishedBySlug(slug);
    const registration = await this.registrationModel
      .findOne({
        eventId: event._id,
        userId: new Types.ObjectId(userId),
        status: EventRegistrationStatus.REGISTERED,
      })
      .exec();
    if (!registration) {
      throw new NotFoundException('La inscripción no existe.');
    }
    registration.status = EventRegistrationStatus.CANCELLED;
    registration.cancelledAt = new Date();
    await registration.save();
    await this.notificationsService.notifyEventRegistration(
      userId,
      event,
      'cancelled',
    );
  }

  async listMine(userId: string): Promise<EventRegistrationResponseDto[]> {
    const registrations = await this.registrationModel
      .find({
        userId: new Types.ObjectId(userId),
        status: EventRegistrationStatus.REGISTERED,
      })
      .sort({ registeredAt: -1 })
      .exec();
    const events = await this.eventModel
      .find({
        _id: { $in: registrations.map((item) => item.eventId) },
        status: EventStatus.PUBLISHED,
      })
      .exec();

    const eventMap = new Map(events.map((event) => [event.id, event]));
    const responses = await Promise.all(
      registrations.map(async (registration) => {
        const event = eventMap.get(registration.eventId.toString());
        return event ? this.toResponse(registration, event, userId) : null;
      }),
    );
    return responses.filter(
      (item): item is EventRegistrationResponseDto => item !== null,
    );
  }

  private async reactivate(
    registration: EventRegistrationDocument,
  ): Promise<EventRegistrationDocument> {
    registration.status = EventRegistrationStatus.REGISTERED;
    registration.registeredAt = new Date();
    registration.cancelledAt = null;
    await registration.save();
    return registration;
  }

  private async toResponse(
    registration: EventRegistrationDocument,
    event: EventDocument,
    userId: string,
  ): Promise<EventRegistrationResponseDto> {
    return {
      id: registration._id.toString(),
      status: registration.status,
      registeredAt: registration.registeredAt,
      event: await this.eventsService.present(event, userId),
    };
  }

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}

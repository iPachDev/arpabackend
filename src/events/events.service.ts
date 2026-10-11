import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { CreateEventDto } from './dto/create-event.dto';
import { ArchiveEventDto } from './dto/archive-event.dto';
import { EventSessionDto } from './dto/event-session.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import {
  EventRegistration,
  EventRegistrationDocument,
  EventRegistrationStatus,
} from './schemas/event-registration.schema';
import { Event, EventDocument, EventStatus } from './schemas/event.schema';
import {
  EventOwnershipTransfer,
  EventOwnershipTransferDocument,
  EventOwnershipTransferStatus,
} from './schemas/event-ownership-transfer.schema';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,
    @InjectModel(EventRegistration.name)
    private readonly registrationModel: Model<EventRegistrationDocument>,
    @InjectModel(EventOwnershipTransfer.name)
    private readonly transferModel: Model<EventOwnershipTransferDocument>,
  ) {}

  async create(userId: string, dto: CreateEventDto): Promise<EventResponseDto> {
    const sessions = this.normalizeSessions(dto.sessions);
    this.validateSchedule(sessions, dto.registrationDeadline);
    const slug = await this.availableSlug(dto.title);

    try {
      const event = await this.eventModel.create({
        ...dto,
        sessions,
        startsAt: sessions[0].startsAt,
        endsAt: this.scheduleEnd(sessions),
        location: sessions[0].location ?? null,
        slug,
        createdByUserId: new Types.ObjectId(userId),
      });
      return this.present(event, userId);
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'No pudimos generar un identificador único para el evento.',
        );
      }
      throw error;
    }
  }

  async listPublished(userId: string): Promise<EventResponseDto[]> {
    const events = await this.eventModel
      .find({
        status: EventStatus.PUBLISHED,
        endsAt: { $gte: new Date() },
      })
      .sort({ startsAt: 1 })
      .exec();
    return Promise.all(events.map((event) => this.present(event, userId)));
  }

  async listMine(userId: string): Promise<EventResponseDto[]> {
    const events = await this.eventModel
      .find({
        createdByUserId: new Types.ObjectId(userId),
        status: EventStatus.PUBLISHED,
      })
      .sort({ startsAt: 1 })
      .exec();
    return Promise.all(events.map((event) => this.present(event, userId)));
  }

  async getBySlug(userId: string, slug: string): Promise<EventResponseDto> {
    const event = await this.findPublishedBySlug(slug);
    return this.present(event, userId);
  }

  async update(
    userId: string,
    slug: string,
    dto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    const event = await this.eventModel
      .findOne({
        slug: slug.trim().toLowerCase(),
        createdByUserId: new Types.ObjectId(userId),
        status: EventStatus.PUBLISHED,
      })
      .exec();
    if (!event) throw new NotFoundException('El evento no existe.');

    const sessions = this.normalizeSessions(
      dto.sessions ?? this.sessionsFromEvent(event),
    );
    const deadline =
      dto.registrationDeadline === undefined
        ? event.registrationDeadline
        : dto.registrationDeadline;
    this.validateSchedule(sessions, deadline);

    if (dto.maxParticipants) {
      const registrations = await this.registrationModel
        .countDocuments({
          eventId: event._id,
          status: EventRegistrationStatus.REGISTERED,
        })
        .exec();
      if (registrations > dto.maxParticipants) {
        throw new ConflictException(
          'El cupo no puede ser menor a las inscripciones actuales.',
        );
      }
    }

    Object.assign(event, dto, {
      sessions,
      startsAt: sessions[0].startsAt,
      endsAt: this.scheduleEnd(sessions),
      location: sessions[0].location ?? null,
    });
    await event.save();
    return this.present(event, userId);
  }

  async findPublishedBySlug(slug: string): Promise<EventDocument> {
    const event = await this.eventModel
      .findOne({
        slug: slug.trim().toLowerCase(),
        status: EventStatus.PUBLISHED,
      })
      .exec();
    if (!event) throw new NotFoundException('El evento no existe.');
    return event;
  }

  async archive(
    userId: string,
    slug: string,
    dto: ArchiveEventDto,
  ): Promise<void> {
    const event = await this.eventModel
      .findOne({
        slug: slug.trim().toLowerCase(),
        createdByUserId: new Types.ObjectId(userId),
        status: EventStatus.PUBLISHED,
      })
      .exec();
    if (!event) throw new NotFoundException('El evento no existe.');
    if (dto.confirmationTitle !== event.title) {
      throw new ConflictException(
        'El nombre de confirmación no coincide con el evento.',
      );
    }

    event.status = EventStatus.ARCHIVED;
    event.archivedAt = new Date();
    event.archivedByUserId = new Types.ObjectId(userId);
    await event.save();
    await this.transferModel
      .updateMany(
        {
          eventId: event._id,
          status: EventOwnershipTransferStatus.PENDING,
        },
        { $set: { status: EventOwnershipTransferStatus.CANCELLED } },
      )
      .exec();
  }

  async present(
    event: EventDocument,
    userId: string,
  ): Promise<EventResponseDto> {
    const userObjectId = new Types.ObjectId(userId);
    const [registrationCount, registration] = await Promise.all([
      this.registrationModel
        .countDocuments({
          eventId: event._id,
          status: EventRegistrationStatus.REGISTERED,
        })
        .exec(),
      this.registrationModel
        .exists({
          eventId: event._id,
          userId: userObjectId,
          status: EventRegistrationStatus.REGISTERED,
        })
        .exec(),
    ]);

    return {
      id: event._id.toString(),
      slug: event.slug,
      title: event.title,
      type: event.type,
      discipline: event.discipline,
      description: event.description,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      registrationDeadline: event.registrationDeadline ?? null,
      location: event.location ?? null,
      sessions: this.sessionsFromEvent(event),
      maxParticipants: event.maxParticipants ?? null,
      imageUrl: event.imageUrl ?? null,
      status: event.status,
      createdByUserId: event.createdByUserId.toString(),
      registrationCount,
      isRegistered: Boolean(registration),
      canEdit: event.createdByUserId.equals(userId),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  private validateSchedule(
    sessions: EventSessionDto[],
    registrationDeadline?: Date | null,
  ) {
    for (const session of sessions) {
      if (session.endsAt.getTime() <= session.startsAt.getTime()) {
        throw new BadRequestException(
          'La hora de fin debe ser posterior al inicio en cada fecha.',
        );
      }
    }
    if (
      registrationDeadline &&
      registrationDeadline.getTime() > sessions[0].startsAt.getTime()
    ) {
      throw new BadRequestException(
        'El cierre de inscripciones no puede ser posterior al inicio.',
      );
    }
  }

  private normalizeSessions(sessions: EventSessionDto[]): EventSessionDto[] {
    return [...sessions].sort(
      (left, right) => left.startsAt.getTime() - right.startsAt.getTime(),
    );
  }

  private sessionsFromEvent(event: EventDocument): EventSessionDto[] {
    if (event.sessions?.length) {
      return event.sessions.map((session, index) => ({
        name: session.name?.trim() || `Fecha #${index + 1}`,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        location: session.location ?? null,
      }));
    }
    return [
      {
        name: 'Fecha #1',
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        location: event.location ?? null,
      },
    ];
  }

  private scheduleEnd(sessions: EventSessionDto[]): Date {
    return new Date(
      Math.max(...sessions.map((session) => session.endsAt.getTime())),
    );
  }

  private async availableSlug(title: string): Promise<string> {
    const baseSlug =
      title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 90) || 'evento';
    const exists = await this.eventModel.exists({ slug: baseSlug }).exec();
    return exists ? `${baseSlug}-${randomBytes(3).toString('hex')}` : baseSlug;
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

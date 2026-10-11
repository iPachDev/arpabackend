import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { EmailService } from '../email/email.service';
import { User, UserDocument, UserStatus } from '../users/schemas/user.schema';
import { CreateEventOwnershipTransferDto } from './dto/create-event-ownership-transfer.dto';
import { EventOwnershipTransferPreviewDto } from './dto/event-ownership-transfer-preview.dto';
import {
  AcceptEventOwnershipTransferResponseDto,
  EventOwnershipTransferResponseDto,
} from './dto/event-ownership-transfer-response.dto';
import {
  EventOwnershipTransfer,
  EventOwnershipTransferDocument,
  EventOwnershipTransferStatus,
} from './schemas/event-ownership-transfer.schema';
import { Event, EventDocument, EventStatus } from './schemas/event.schema';

@Injectable()
export class EventOwnershipTransfersService {
  constructor(
    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,
    @InjectModel(EventOwnershipTransfer.name)
    private readonly transferModel: Model<EventOwnershipTransferDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async invite(
    ownerId: string,
    slug: string,
    dto: CreateEventOwnershipTransferDto,
  ): Promise<EventOwnershipTransferResponseDto> {
    const event = await this.findOwnedEvent(ownerId, slug);
    await this.expirePendingTransfers(event._id);

    const [currentOwner, newOwner, pending] = await Promise.all([
      this.userModel.findById(ownerId).exec(),
      this.userModel
        .findOne({ email: dto.email, status: UserStatus.ACTIVE })
        .exec(),
      this.transferModel
        .findOne({
          eventId: event._id,
          status: EventOwnershipTransferStatus.PENDING,
        })
        .exec(),
    ]);
    if (!currentOwner) throw new NotFoundException('El usuario no existe.');
    if (!newOwner) {
      throw new NotFoundException(
        'El nuevo propietario debe tener una cuenta activa en ARPA.',
      );
    }
    if (newOwner._id.equals(ownerId)) {
      throw new ConflictException('Ya eres propietario de este evento.');
    }
    if (pending) {
      throw new ConflictException(
        'Ya existe una transferencia pendiente para este evento.',
      );
    }

    const token = randomBytes(32).toString('base64url');
    const ttlDays = Number(
      this.configService.get<string>('EVENT_OWNERSHIP_TRANSFER_TTL_DAYS', '7'),
    );
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const transfer = await this.transferModel.create({
      eventId: event._id,
      fromUserId: new Types.ObjectId(ownerId),
      toUserId: newOwner._id,
      email: newOwner.email,
      tokenHash: this.hashToken(token),
      expiresAt,
    });

    try {
      transfer.resendEmailId =
        await this.emailService.sendEventOwnershipTransfer({
          to: newOwner.email,
          newOwnerName: newOwner.name,
          currentOwnerName: currentOwner.name,
          eventName: event.title,
          transferUrl: `${this.frontendUrl}/event-ownership-transfers/${token}`,
          expiresAt,
        });
      await transfer.save();
    } catch (error) {
      transfer.status = EventOwnershipTransferStatus.FAILED;
      await transfer.save();
      throw error;
    }

    return this.toResponse(transfer, event);
  }

  async preview(token: string): Promise<EventOwnershipTransferPreviewDto> {
    const transfer = await this.findTransfer(token);
    await this.expireIfNeeded(transfer);
    const [event, newOwner] = await Promise.all([
      this.eventModel.findById(transfer.eventId).exec(),
      this.userModel.findById(transfer.toUserId).exec(),
    ]);
    if (!event || event.status !== EventStatus.PUBLISHED || !newOwner) {
      throw new NotFoundException('La transferencia no está disponible.');
    }
    return {
      eventName: event.title,
      eventSlug: event.slug,
      email: transfer.email,
      newOwnerName: newOwner.name,
      status: transfer.status,
      expiresAt: transfer.expiresAt,
    };
  }

  async accept(
    token: string,
    userId: string,
    userEmail: string,
  ): Promise<AcceptEventOwnershipTransferResponseDto> {
    const transfer = await this.findTransfer(token);
    await this.expireIfNeeded(transfer);
    if (transfer.status === EventOwnershipTransferStatus.EXPIRED) {
      throw new GoneException('La transferencia expiró.');
    }
    if (transfer.status !== EventOwnershipTransferStatus.PENDING) {
      throw new BadRequestException('La transferencia ya no está disponible.');
    }
    if (
      transfer.email !== userEmail.trim().toLowerCase() ||
      !transfer.toUserId.equals(userId)
    ) {
      throw new ForbiddenException(
        'Inicia sesión con el correo que recibió la transferencia.',
      );
    }

    const event = await this.eventModel.findById(transfer.eventId).exec();
    if (!event || event.status !== EventStatus.PUBLISHED) {
      throw new NotFoundException('El evento no existe.');
    }
    const result = await this.eventModel
      .updateOne(
        {
          _id: event._id,
          createdByUserId: transfer.fromUserId,
          status: EventStatus.PUBLISHED,
        },
        { $set: { createdByUserId: transfer.toUserId } },
      )
      .exec();
    if (result.modifiedCount !== 1) {
      transfer.status = EventOwnershipTransferStatus.CANCELLED;
      await transfer.save();
      throw new ConflictException('La propiedad del evento ya cambió.');
    }

    transfer.status = EventOwnershipTransferStatus.ACCEPTED;
    transfer.acceptedAt = new Date();
    await transfer.save();
    return { eventSlug: event.slug, eventName: event.title };
  }

  private findOwnedEvent(ownerId: string, slug: string) {
    return this.eventModel
      .findOne({
        slug: slug.trim().toLowerCase(),
        createdByUserId: new Types.ObjectId(ownerId),
        status: EventStatus.PUBLISHED,
      })
      .exec()
      .then((event) => {
        if (!event) throw new NotFoundException('El evento no existe.');
        return event;
      });
  }

  private findTransfer(token: string): Promise<EventOwnershipTransferDocument> {
    return this.transferModel
      .findOne({ tokenHash: this.hashToken(token) })
      .exec()
      .then((transfer) => {
        if (!transfer) {
          throw new NotFoundException('La transferencia no existe.');
        }
        return transfer;
      });
  }

  private async expirePendingTransfers(eventId: Types.ObjectId) {
    await this.transferModel
      .updateMany(
        {
          eventId,
          status: EventOwnershipTransferStatus.PENDING,
          expiresAt: { $lte: new Date() },
        },
        { $set: { status: EventOwnershipTransferStatus.EXPIRED } },
      )
      .exec();
  }

  private async expireIfNeeded(transfer: EventOwnershipTransferDocument) {
    if (
      transfer.status === EventOwnershipTransferStatus.PENDING &&
      transfer.expiresAt.getTime() <= Date.now()
    ) {
      transfer.status = EventOwnershipTransferStatus.EXPIRED;
      await transfer.save();
    }
  }

  private toResponse(
    transfer: EventOwnershipTransferDocument,
    event: EventDocument,
  ): EventOwnershipTransferResponseDto {
    return {
      id: transfer._id.toString(),
      eventName: event.title,
      email: transfer.email,
      status: transfer.status,
      expiresAt: transfer.expiresAt,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private get frontendUrl(): string {
    return this.configService
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .replace(/\/$/, '');
  }
}

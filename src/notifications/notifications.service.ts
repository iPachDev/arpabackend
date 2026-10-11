import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmailService } from '../email/email.service';
import { EventDocument } from '../events/schemas/event.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { NotificationResponseDto } from './dto/notification-response.dto';
import {
  Notification,
  NotificationDocument,
  NotificationEmailStatus,
  NotificationType,
} from './schemas/notification.schema';

export type EventNotificationAction = 'registered' | 'cancelled';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async notifyEventRegistration(
    userId: string,
    event: EventDocument,
    action: EventNotificationAction,
  ): Promise<void> {
    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) return;

      const confirmed = action === 'registered';
      const title = confirmed
        ? `Inscripción confirmada: ${event.title}`
        : `Inscripción cancelada: ${event.title}`;
      const message = confirmed
        ? `Tu lugar en ${event.title} quedó confirmado.`
        : `Tu inscripción a ${event.title} fue cancelada.`;
      const notification = await this.notificationModel.create({
        userId: new Types.ObjectId(userId),
        eventId: event._id,
        type: confirmed
          ? NotificationType.EVENT_REGISTRATION_CONFIRMED
          : NotificationType.EVENT_REGISTRATION_CANCELLED,
        title,
        message,
      });

      try {
        notification.resendEmailId =
          await this.emailService.sendEventRegistrationNotification({
            to: user.email,
            userName: user.name,
            eventName: event.title,
            action,
            eventUrl: `${this.frontendUrl}/events/${event.slug}`,
            sessions: (event.sessions?.length
              ? event.sessions
              : [
                  {
                    name: 'Fecha #1',
                    startsAt: event.startsAt,
                    endsAt: event.endsAt,
                    location: event.location,
                  },
                ]
            ).map((session, index) => ({
              name: session.name?.trim() || `Fecha #${index + 1}`,
              startsAt: session.startsAt,
              endsAt: session.endsAt,
              locationName: session.location?.name ?? null,
            })),
          });
        notification.emailStatus = NotificationEmailStatus.SENT;
      } catch (error) {
        notification.emailStatus = NotificationEmailStatus.FAILED;
        notification.emailError = (
          error instanceof Error ? error.message : 'Error de correo'
        ).slice(0, 300);
      }
      await notification.save();
    } catch {
      // La inscripción no debe revertirse por un fallo de notificación.
    }
  }

  async listMine(userId: string): Promise<NotificationResponseDto[]> {
    const notifications = await this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
    return notifications.map((notification) => this.toResponse(notification));
  }

  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationResponseDto> {
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new NotFoundException('La notificación no existe.');
    }
    const notification = await this.notificationModel
      .findOne({
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!notification) {
      throw new NotFoundException('La notificación no existe.');
    }
    notification.readAt ??= new Date();
    await notification.save();
    return this.toResponse(notification);
  }

  private toResponse(notification: NotificationDocument) {
    return {
      id: notification._id.toString(),
      eventId: notification.eventId.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      emailStatus: notification.emailStatus,
      readAt: notification.readAt ?? null,
      createdAt: notification.createdAt,
    };
  }

  private get frontendUrl(): string {
    return this.configService
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .replace(/\/$/, '');
  }
}

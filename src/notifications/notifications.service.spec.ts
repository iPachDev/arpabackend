import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { EmailService } from '../email/email.service';
import {
  EventType,
  EventDiscipline,
  EventStatus,
} from '../events/schemas/event.schema';
import { User } from '../users/schemas/user.schema';
import { NotificationsService } from './notifications.service';
import {
  Notification,
  NotificationEmailStatus,
} from './schemas/notification.schema';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const userExec = jest.fn();
  const notificationExec = jest.fn();
  const userModel = { findById: jest.fn(() => ({ exec: userExec })) };
  const notificationModel = {
    create: jest.fn(),
    find: jest.fn(() => ({
      sort: jest.fn(() => ({
        limit: jest.fn(() => ({ exec: notificationExec })),
      })),
    })),
    findOne: jest.fn(() => ({ exec: notificationExec })),
  };
  const emailService = { sendEventRegistrationNotification: jest.fn() };
  const userId = new Types.ObjectId();
  const event = {
    _id: new Types.ObjectId(),
    slug: 'copa-arpa',
    title: 'Copa ARPA',
    type: EventType.CHAMPIONSHIP,
    discipline: EventDiscipline.KARTING,
    status: EventStatus.PUBLISHED,
    startsAt: new Date('2026-12-10T15:00:00.000Z'),
    endsAt: new Date('2026-12-10T20:00:00.000Z'),
    location: null,
    sessions: [
      {
        name: 'Final',
        startsAt: new Date('2026-12-10T15:00:00.000Z'),
        endsAt: new Date('2026-12-10T20:00:00.000Z'),
        location: null,
      },
    ],
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getModelToken(Notification.name),
          useValue: notificationModel,
        },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: EmailService, useValue: emailService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key, fallback) => fallback) },
        },
      ],
    }).compile();
    service = module.get(NotificationsService);
    jest.clearAllMocks();
    userExec.mockResolvedValue({ name: 'Fernando', email: 'fer@example.com' });
  });

  it('persiste y envía la confirmación de inscripción', async () => {
    const notification = {
      emailStatus: NotificationEmailStatus.PENDING,
      resendEmailId: null,
      emailError: null,
      save: jest.fn(),
    };
    notificationModel.create.mockResolvedValue(notification);
    emailService.sendEventRegistrationNotification.mockResolvedValue(
      'email-id',
    );

    await service.notifyEventRegistration(
      userId.toString(),
      event as never,
      'registered',
    );

    expect(notificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId, eventId: event._id }),
    );
    expect(notification.emailStatus).toBe(NotificationEmailStatus.SENT);
    expect(notification.resendEmailId).toBe('email-id');
    expect(notification.save).toHaveBeenCalled();
  });

  it('conserva la notificación si falla el correo', async () => {
    const notification = {
      emailStatus: NotificationEmailStatus.PENDING,
      resendEmailId: null,
      emailError: null as string | null,
      save: jest.fn(),
    };
    notificationModel.create.mockResolvedValue(notification);
    emailService.sendEventRegistrationNotification.mockRejectedValue(
      new Error('Resend no disponible'),
    );

    await expect(
      service.notifyEventRegistration(
        userId.toString(),
        event as never,
        'cancelled',
      ),
    ).resolves.toBeUndefined();
    expect(notification.emailStatus).toBe(NotificationEmailStatus.FAILED);
    expect(notification.emailError).toBe('Resend no disponible');
    expect(notification.save).toHaveBeenCalled();
  });
});

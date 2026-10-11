import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Event } from '../../events/schemas/event.schema';
import { User } from '../../users/schemas/user.schema';

export enum NotificationType {
  EVENT_REGISTRATION_CONFIRMED = 'event_registration_confirmed',
  EVENT_REGISTRATION_CANCELLED = 'event_registration_cancelled',
}

export enum NotificationEmailStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

@Schema({ collection: 'notifications', timestamps: true, versionKey: false })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Event.name, required: true, index: true })
  eventId: Types.ObjectId;

  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ required: true, trim: true, maxlength: 160 })
  title: string;

  @Prop({ required: true, trim: true, maxlength: 500 })
  message: string;

  @Prop({
    type: String,
    enum: NotificationEmailStatus,
    default: NotificationEmailStatus.PENDING,
  })
  emailStatus: NotificationEmailStatus;

  @Prop({ default: null })
  resendEmailId: string | null;

  @Prop({ default: null, maxlength: 300 })
  emailError: string | null;

  @Prop({ default: null })
  readAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, createdAt: -1 });

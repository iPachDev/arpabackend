import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Event } from './event.schema';

export enum EventRegistrationStatus {
  REGISTERED = 'registered',
  CANCELLED = 'cancelled',
}

@Schema({
  collection: 'event_registrations',
  timestamps: true,
  versionKey: false,
})
export class EventRegistration {
  @Prop({ type: Types.ObjectId, ref: Event.name, required: true, index: true })
  eventId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: EventRegistrationStatus,
    default: EventRegistrationStatus.REGISTERED,
  })
  status: EventRegistrationStatus;

  @Prop({ required: true, default: Date.now })
  registeredAt: Date;

  @Prop({ default: null })
  cancelledAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type EventRegistrationDocument = HydratedDocument<EventRegistration>;
export const EventRegistrationSchema =
  SchemaFactory.createForClass(EventRegistration);

EventRegistrationSchema.index({ eventId: 1, userId: 1 }, { unique: true });
EventRegistrationSchema.index({ userId: 1, status: 1, registeredAt: -1 });

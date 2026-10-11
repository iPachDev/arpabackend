import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Event } from './event.schema';

export enum EventOwnershipTransferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

@Schema({
  collection: 'event_ownership_transfers',
  timestamps: true,
  versionKey: false,
})
export class EventOwnershipTransfer {
  @Prop({ type: Types.ObjectId, ref: Event.name, required: true })
  eventId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  fromUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  toUserId: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, unique: true, select: false })
  tokenHash: string;

  @Prop({
    type: String,
    enum: EventOwnershipTransferStatus,
    default: EventOwnershipTransferStatus.PENDING,
    index: true,
  })
  status: EventOwnershipTransferStatus;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  acceptedAt: Date | null;

  @Prop({ type: String, default: null })
  resendEmailId: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export type EventOwnershipTransferDocument =
  HydratedDocument<EventOwnershipTransfer>;
export const EventOwnershipTransferSchema = SchemaFactory.createForClass(
  EventOwnershipTransfer,
);

EventOwnershipTransferSchema.index({ eventId: 1, createdAt: -1 });
EventOwnershipTransferSchema.index(
  { eventId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: EventOwnershipTransferStatus.PENDING,
    },
  },
);

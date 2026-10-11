import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export enum EventType {
  COMPETITION = 'competition',
  TRAINING = 'training',
  MEETUP = 'meetup',
  CHAMPIONSHIP = 'championship',
}

export enum EventDiscipline {
  KARTING = 'karting',
  RUNNING = 'running',
  CYCLING = 'cycling',
  MOTORSPORT = 'motorsport',
}

export enum EventStatus {
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Schema({ _id: false })
export class EventLocation {
  @Prop({ trim: true, maxlength: 100, default: null })
  referenceSlug: string | null;

  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ required: true, trim: true, maxlength: 180 })
  address: string;

  @Prop({ required: true, trim: true, maxlength: 100 })
  city: string;
}

export const EventLocationSchema = SchemaFactory.createForClass(EventLocation);

@Schema({ _id: false })
export class EventSession {
  @Prop({ required: true, trim: true, maxlength: 80 })
  name: string;

  @Prop({ required: true })
  startsAt: Date;

  @Prop({ required: true })
  endsAt: Date;

  @Prop({ type: EventLocationSchema, default: null })
  location: EventLocation | null;
}

export const EventSessionSchema = SchemaFactory.createForClass(EventSession);

@Schema({ collection: 'events', timestamps: true, versionKey: false })
export class Event {
  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string;

  @Prop({ required: true, lowercase: true, trim: true, unique: true })
  slug: string;

  @Prop({ required: true, type: String, enum: EventType })
  type: EventType;

  @Prop({ required: true, type: String, enum: EventDiscipline })
  discipline: EventDiscipline;

  @Prop({ required: true, trim: true, maxlength: 1000 })
  description: string;

  @Prop({ required: true })
  startsAt: Date;

  @Prop({ required: true })
  endsAt: Date;

  @Prop({ default: null })
  registrationDeadline: Date | null;

  @Prop({ type: EventLocationSchema, default: null })
  location: EventLocation | null;

  @Prop({ type: [EventSessionSchema], default: [] })
  sessions: EventSession[];

  @Prop({ type: Number, min: 1, max: 100000, default: null })
  maxParticipants: number | null;

  @Prop({ trim: true, maxlength: 2048, default: null })
  imageUrl: string | null;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  createdByUserId: Types.ObjectId;

  @Prop({ type: String, enum: EventStatus, default: EventStatus.PUBLISHED })
  status: EventStatus;

  @Prop({ type: Date, default: null })
  archivedAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  archivedByUserId: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

export type EventDocument = HydratedDocument<Event>;
export const EventSchema = SchemaFactory.createForClass(Event);

EventSchema.index({ status: 1, startsAt: 1 });
EventSchema.index({ createdByUserId: 1, createdAt: -1 });

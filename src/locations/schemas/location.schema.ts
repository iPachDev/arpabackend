import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export enum LocationDiscipline {
  KARTING = 'karting',
  RUNNING = 'running',
  CYCLING = 'cycling',
  MOTORSPORT = 'motorsport',
}

export enum LocationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

@Schema({ collection: 'locations', timestamps: true, versionKey: false })
export class Location {
  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true, unique: true })
  slug: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  business: string;

  @Prop({ required: true, type: String, enum: LocationDiscipline })
  discipline: LocationDiscipline;

  @Prop({ required: true, trim: true, maxlength: 180 })
  address: string;

  @Prop({ required: true, trim: true, maxlength: 100 })
  city: string;

  @Prop({ required: true, trim: true, maxlength: 1000 })
  description: string;

  @Prop({ trim: true, maxlength: 2048, default: null })
  coverImageUrl: string | null;

  @Prop({ trim: true, maxlength: 2048, default: null })
  circuitMapImageUrl: string | null;

  @Prop({ type: [String], default: [] })
  photoUrls: string[];

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ type: String, enum: LocationStatus, default: LocationStatus.ACTIVE })
  status: LocationStatus;

  @Prop({ type: Date, default: null })
  archivedAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  archivedByUserId: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

export type LocationDocument = HydratedDocument<Location>;
export const LocationSchema = SchemaFactory.createForClass(Location);

LocationSchema.index({ ownerId: 1, status: 1, createdAt: -1 });

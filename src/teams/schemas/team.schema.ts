import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export enum TeamDiscipline {
  KARTING = 'karting',
  RUNNING = 'running',
  CYCLING = 'cycling',
  MOTORSPORT = 'motorsport',
}

export enum TeamPrivacy {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export enum TeamStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum TeamMemberRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  READER = 'reader',
}

@Schema({ collection: 'teams', timestamps: true, versionKey: false })
export class Team {
  @Prop({ required: true, trim: true, maxlength: 100 })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true, unique: true })
  slug: string;

  @Prop({ required: true, type: String, enum: TeamDiscipline })
  discipline: TeamDiscipline;

  @Prop({ required: true, type: String, enum: TeamPrivacy })
  privacy: TeamPrivacy;

  @Prop({ required: true, trim: true, maxlength: 120 })
  location: string;

  @Prop({ required: true, trim: true, maxlength: 500 })
  description: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ type: String, enum: TeamStatus, default: TeamStatus.ACTIVE })
  status: TeamStatus;

  createdAt: Date;
  updatedAt: Date;
}

export type TeamDocument = HydratedDocument<Team>;
export const TeamSchema = SchemaFactory.createForClass(Team);

TeamSchema.index({ ownerId: 1, createdAt: -1 });


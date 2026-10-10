import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum UserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

export enum UserRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  READER = 'reader',
}

export enum RacingInterest {
  KARTING = 'karting',
  FORMULA = 'formula',
  GT = 'gt',
  RALLY = 'rally',
  OFF_ROAD = 'off-road',
  SIM_RACING = 'sim-racing',
}

@Schema({
  collection: 'users',
  timestamps: true,
  versionKey: false,
})
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true, unique: true })
  email: string;

  @Prop({ required: true, trim: true, unique: true })
  phone: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.READER,
  })
  role: UserRole;

  @Prop({ type: String, trim: true, maxlength: 30, default: null })
  alias: string | null;

  @Prop({ type: String, trim: true, maxlength: 280, default: null })
  bio: string | null;

  @Prop({ type: String, trim: true, maxlength: 80, default: null })
  city: string | null;

  @Prop({ type: String, trim: true, maxlength: 80, default: null })
  country: string | null;

  @Prop({ type: Number, min: 1, max: 999, default: null })
  racingNumber: number | null;

  @Prop({ type: [String], enum: RacingInterest, default: [] })
  favoriteCategories: RacingInterest[];

  @Prop({ type: String, trim: true, maxlength: 100, default: null })
  favoriteDriver: string | null;

  @Prop({ type: String, trim: true, maxlength: 100, default: null })
  favoriteTrack: string | null;

  @Prop({ type: String, default: null })
  avatarUrl: string | null;

  @Prop({ type: String, default: null })
  coverUrl: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

@Schema({
  collection: 'sessions',
  timestamps: true,
  versionKey: false,
})
export class Session {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true, select: false })
  tokenHash: string;

  @Prop({ required: true, maxlength: 500 })
  userAgent: string;

  @Prop({ required: true, maxlength: 100 })
  ipAddress: string;

  @Prop({ required: true, default: Date.now })
  lastSeenAt: Date;

  @Prop({ required: true, expires: 0 })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type SessionDocument = HydratedDocument<Session>;
export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index({ userId: 1, createdAt: -1 });
SessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });

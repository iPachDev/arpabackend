import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Team } from './team.schema';

export enum TeamOwnershipTransferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

@Schema({
  collection: 'team_ownership_transfers',
  timestamps: true,
  versionKey: false,
})
export class TeamOwnershipTransfer {
  @Prop({ type: Types.ObjectId, ref: Team.name, required: true })
  teamId: Types.ObjectId;

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
    enum: TeamOwnershipTransferStatus,
    default: TeamOwnershipTransferStatus.PENDING,
    index: true,
  })
  status: TeamOwnershipTransferStatus;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  acceptedAt: Date | null;

  @Prop({ type: String, default: null })
  resendEmailId: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export type TeamOwnershipTransferDocument =
  HydratedDocument<TeamOwnershipTransfer>;
export const TeamOwnershipTransferSchema = SchemaFactory.createForClass(
  TeamOwnershipTransfer,
);

TeamOwnershipTransferSchema.index({ teamId: 1, createdAt: -1 });
TeamOwnershipTransferSchema.index(
  { teamId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: TeamOwnershipTransferStatus.PENDING },
  },
);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Team, TeamMemberRole } from './team.schema';

export enum TeamInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

@Schema({
  collection: 'team_invitations',
  timestamps: true,
  versionKey: false,
})
export class TeamInvitation {
  @Prop({ type: Types.ObjectId, ref: Team.name, required: true, index: true })
  teamId: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, trim: true, maxlength: 100 })
  invitedName: string;

  @Prop({ required: true, trim: true, maxlength: 60 })
  sportsRole: string;

  @Prop({ type: String, enum: TeamMemberRole, required: true })
  memberRole: TeamMemberRole;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  invitedByUserId: Types.ObjectId;

  @Prop({ required: true, unique: true, select: false })
  tokenHash: string;

  @Prop({
    type: String,
    enum: TeamInvitationStatus,
    default: TeamInvitationStatus.PENDING,
    index: true,
  })
  status: TeamInvitationStatus;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  acceptedByUserId: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  acceptedAt: Date | null;

  @Prop({ type: String, default: null })
  resendEmailId: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export type TeamInvitationDocument = HydratedDocument<TeamInvitation>;
export const TeamInvitationSchema =
  SchemaFactory.createForClass(TeamInvitation);

TeamInvitationSchema.index({ teamId: 1, createdAt: -1 });
TeamInvitationSchema.index(
  { teamId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { status: TeamInvitationStatus.PENDING },
  },
);

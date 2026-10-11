import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Location } from './location.schema';

export enum LocationOwnershipTransferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

@Schema({
  collection: 'location_ownership_transfers',
  timestamps: true,
  versionKey: false,
})
export class LocationOwnershipTransfer {
  @Prop({ type: Types.ObjectId, ref: Location.name, required: true })
  locationId: Types.ObjectId;

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
    enum: LocationOwnershipTransferStatus,
    default: LocationOwnershipTransferStatus.PENDING,
    index: true,
  })
  status: LocationOwnershipTransferStatus;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  acceptedAt: Date | null;

  @Prop({ type: String, default: null })
  resendEmailId: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export type LocationOwnershipTransferDocument =
  HydratedDocument<LocationOwnershipTransfer>;
export const LocationOwnershipTransferSchema = SchemaFactory.createForClass(
  LocationOwnershipTransfer,
);

LocationOwnershipTransferSchema.index({ locationId: 1, createdAt: -1 });
LocationOwnershipTransferSchema.index(
  { locationId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: LocationOwnershipTransferStatus.PENDING,
    },
  },
);

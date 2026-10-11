import { ApiProperty } from '@nestjs/swagger';
import { EventOwnershipTransferStatus } from '../schemas/event-ownership-transfer.schema';

export class EventOwnershipTransferPreviewDto {
  @ApiProperty()
  eventName: string;

  @ApiProperty()
  eventSlug: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  newOwnerName: string;

  @ApiProperty({ enum: EventOwnershipTransferStatus })
  status: EventOwnershipTransferStatus;

  @ApiProperty()
  expiresAt: Date;
}

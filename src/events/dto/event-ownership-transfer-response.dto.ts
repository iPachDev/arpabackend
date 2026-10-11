import { ApiProperty } from '@nestjs/swagger';
import { EventOwnershipTransferStatus } from '../schemas/event-ownership-transfer.schema';

export class EventOwnershipTransferResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  eventName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: EventOwnershipTransferStatus })
  status: EventOwnershipTransferStatus;

  @ApiProperty()
  expiresAt: Date;
}

export class AcceptEventOwnershipTransferResponseDto {
  @ApiProperty()
  eventSlug: string;

  @ApiProperty()
  eventName: string;
}

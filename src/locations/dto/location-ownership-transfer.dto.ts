import { ApiProperty } from '@nestjs/swagger';
import { LocationOwnershipTransferStatus } from '../schemas/location-ownership-transfer.schema';

export class LocationOwnershipTransferResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() locationName: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: LocationOwnershipTransferStatus })
  status: LocationOwnershipTransferStatus;
  @ApiProperty() expiresAt: Date;
}

export class LocationOwnershipTransferPreviewDto {
  @ApiProperty() locationName: string;
  @ApiProperty() locationSlug: string;
  @ApiProperty() email: string;
  @ApiProperty() newOwnerName: string;
  @ApiProperty({ enum: LocationOwnershipTransferStatus })
  status: LocationOwnershipTransferStatus;
  @ApiProperty() expiresAt: Date;
}

export class AcceptLocationOwnershipTransferResponseDto {
  @ApiProperty() locationSlug: string;
  @ApiProperty() locationName: string;
}

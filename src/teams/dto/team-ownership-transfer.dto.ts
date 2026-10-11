import { ApiProperty } from '@nestjs/swagger';
import { TeamOwnershipTransferStatus } from '../schemas/team-ownership-transfer.schema';

export class TeamOwnershipTransferResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() teamName: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: TeamOwnershipTransferStatus })
  status: TeamOwnershipTransferStatus;
  @ApiProperty() expiresAt: Date;
}

export class TeamOwnershipTransferPreviewDto {
  @ApiProperty() teamName: string;
  @ApiProperty() teamSlug: string;
  @ApiProperty() email: string;
  @ApiProperty() newOwnerName: string;
  @ApiProperty({ enum: TeamOwnershipTransferStatus })
  status: TeamOwnershipTransferStatus;
  @ApiProperty() expiresAt: Date;
}

export class AcceptTeamOwnershipTransferResponseDto {
  @ApiProperty() teamSlug: string;
  @ApiProperty() teamName: string;
}

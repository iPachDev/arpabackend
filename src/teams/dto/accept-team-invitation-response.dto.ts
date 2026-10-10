import { ApiProperty } from '@nestjs/swagger';

export class AcceptTeamInvitationResponseDto {
  @ApiProperty({ example: 'arpa-racing-team' })
  teamSlug: string;

  @ApiProperty({ example: 'ARPA Racing Team' })
  teamName: string;
}

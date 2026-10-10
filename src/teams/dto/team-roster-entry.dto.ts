import { ApiProperty } from '@nestjs/swagger';
import { TeamInvitationStatus } from '../schemas/team-invitation.schema';
import { TeamMemberRole } from '../schemas/team.schema';

export enum TeamRosterStatus {
  OWNER = 'owner',
  ACCEPTED = 'accepted',
  PENDING = 'pending',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

export class TeamRosterEntryDto {
  @ApiProperty({ example: '66f84cbd29d229e491a23362' })
  id: string;

  @ApiProperty({ example: 'Mariana López' })
  name: string;

  @ApiProperty({ example: 'mariana@example.com' })
  email: string;

  @ApiProperty({ example: 'Piloto' })
  sportsRole: string;

  @ApiProperty({ enum: TeamMemberRole })
  membershipRole: TeamMemberRole;

  @ApiProperty({ enum: TeamRosterStatus })
  status: TeamRosterStatus | TeamInvitationStatus;

  @ApiProperty({ nullable: true, readOnly: true })
  invitedAt: Date | null;

  @ApiProperty({ nullable: true, readOnly: true })
  joinedAt: Date | null;
}

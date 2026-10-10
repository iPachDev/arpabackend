import { ApiProperty } from '@nestjs/swagger';
import { TeamInvitationStatus } from '../schemas/team-invitation.schema';
import { TeamMemberRole } from '../schemas/team.schema';

export class TeamInvitationPreviewDto {
  @ApiProperty({ example: 'ARPA Racing Team' })
  teamName: string;

  @ApiProperty({ example: 'arpa-racing-team' })
  teamSlug: string;

  @ApiProperty({ example: 'mariana@example.com' })
  email: string;

  @ApiProperty({ example: 'Mariana López' })
  invitedName: string;

  @ApiProperty({ example: 'Piloto' })
  sportsRole: string;

  @ApiProperty({ enum: TeamMemberRole })
  membershipRole: TeamMemberRole;

  @ApiProperty({ enum: TeamInvitationStatus })
  status: TeamInvitationStatus;

  @ApiProperty({ example: '2026-10-16T12:00:00.000Z' })
  expiresAt: Date;

  @ApiProperty({
    description: 'Indica si el correo todavía no pertenece a un usuario.',
  })
  requiresRegistration: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  TeamDiscipline,
  TeamMemberRole,
  TeamPrivacy,
  TeamStatus,
} from '../schemas/team.schema';

export class TeamResponseDto {
  @ApiProperty({ example: '66f84cbd29d229e491a23362' })
  id: string;

  @ApiProperty({ example: 'arpa-racing-team' })
  slug: string;

  @ApiProperty({ example: 'ARPA Racing Team' })
  name: string;

  @ApiProperty({ enum: TeamDiscipline })
  discipline: TeamDiscipline;

  @ApiProperty({ enum: TeamPrivacy })
  privacy: TeamPrivacy;

  @ApiProperty({ example: 'Ciudad de México' })
  location: string;

  @ApiProperty({ example: 'Equipo enfocado en competencias regionales.' })
  description: string;

  @ApiProperty({ enum: TeamStatus })
  status: TeamStatus;

  @ApiProperty({ enum: TeamMemberRole, readOnly: true })
  membershipRole: TeamMemberRole;

  @ApiProperty({ example: 1, minimum: 1, readOnly: true })
  memberCount: number;

  @ApiProperty({ example: '2026-10-09T12:00:00.000Z', readOnly: true })
  createdAt: Date;
}

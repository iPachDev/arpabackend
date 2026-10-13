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

  @ApiProperty({
    example: false,
    default: false,
    description:
      'Indica si usuarios autenticados que no son integrantes pueden consultar el perfil.',
  })
  allowNonMembers: boolean;

  @ApiProperty({
    example: false,
    default: false,
    description:
      'Indica si los integrantes aceptados son visibles para visitantes.',
  })
  showMembers: boolean;

  @ApiProperty({ example: 'Ciudad de México', nullable: true })
  location: string | null;

  @ApiProperty({
    example: 'Equipo enfocado en competencias regionales.',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    example:
      'https://arpa.nyc3.digitaloceanspaces.com/teams/id/logo/file.webp?X-Amz-Signature=...',
    nullable: true,
    description: 'URL privada firmada con vigencia de cinco minutos.',
  })
  logoImageUrl: string | null;

  @ApiProperty({
    example:
      'https://arpa.nyc3.digitaloceanspaces.com/teams/id/cover/file.webp?X-Amz-Signature=...',
    nullable: true,
    description: 'URL privada firmada con vigencia de cinco minutos.',
  })
  coverImageUrl: string | null;

  @ApiProperty({
    type: String,
    isArray: true,
    description: 'URLs privadas firmadas con vigencia de cinco minutos.',
  })
  photoUrls: string[];

  @ApiProperty({ enum: TeamStatus })
  status: TeamStatus;

  @ApiProperty({ enum: TeamMemberRole, nullable: true, readOnly: true })
  membershipRole: TeamMemberRole | null;

  @ApiProperty({ example: 1, minimum: 1, nullable: true, readOnly: true })
  memberCount: number | null;

  @ApiProperty({
    example: false,
    readOnly: true,
    description:
      'Indica que el visitante solo puede ver logo, portada y aviso de privacidad.',
  })
  isPrivateView: boolean;

  @ApiProperty({ example: '2026-10-09T12:00:00.000Z', readOnly: true })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-09T12:00:00.000Z', readOnly: true })
  updatedAt: Date;
}

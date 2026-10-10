import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { TeamMemberRole } from '../schemas/team.schema';

const normalizeText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class CreateTeamInvitationDto {
  @ApiProperty({ example: 'Mariana López', minLength: 2, maxLength: 100 })
  @Transform(normalizeText)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  invitedName: string;

  @ApiProperty({ example: 'mariana@example.com', maxLength: 254 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'Piloto', minLength: 2, maxLength: 60 })
  @Transform(normalizeText)
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  sportsRole: string;

  @ApiProperty({
    enum: [TeamMemberRole.EDITOR, TeamMemberRole.READER],
    example: TeamMemberRole.READER,
  })
  @IsIn([TeamMemberRole.EDITOR, TeamMemberRole.READER], {
    message: 'El permiso debe ser editor o reader.',
  })
  memberRole: TeamMemberRole.EDITOR | TeamMemberRole.READER;
}

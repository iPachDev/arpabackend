import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TeamDiscipline, TeamPrivacy } from '../schemas/team.schema';

const normalizeText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class CreateTeamDto {
  @ApiProperty({ example: 'ARPA Racing Team', minLength: 2, maxLength: 100 })
  @Transform(normalizeText)
  @IsString({ message: 'El nombre debe ser texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres.' })
  name: string;

  @ApiProperty({ enum: TeamDiscipline, example: TeamDiscipline.KARTING })
  @IsEnum(TeamDiscipline, { message: 'La disciplina no es válida.' })
  discipline: TeamDiscipline;

  @ApiProperty({ enum: TeamPrivacy, example: TeamPrivacy.PRIVATE })
  @IsEnum(TeamPrivacy, { message: 'La privacidad no es válida.' })
  privacy: TeamPrivacy;

  @ApiProperty({ example: 'Ciudad de México', minLength: 2, maxLength: 120 })
  @Transform(normalizeText)
  @IsString({ message: 'La ubicación debe ser texto.' })
  @MinLength(2, { message: 'La ubicación debe tener al menos 2 caracteres.' })
  @MaxLength(120, { message: 'La ubicación no puede exceder 120 caracteres.' })
  location: string;

  @ApiProperty({
    example: 'Equipo enfocado en competencias regionales de karting.',
    minLength: 10,
    maxLength: 500,
  })
  @Transform(normalizeText)
  @IsString({ message: 'La descripción debe ser texto.' })
  @MinLength(10, {
    message: 'La descripción debe tener al menos 10 caracteres.',
  })
  @MaxLength(500, {
    message: 'La descripción no puede exceder 500 caracteres.',
  })
  description: string;
}


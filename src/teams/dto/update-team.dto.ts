import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TeamDiscipline, TeamPrivacy } from '../schemas/team.schema';

const normalizeText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class UpdateTeamDto {
  @ApiPropertyOptional({
    example: 'ARPA Racing Team',
    minLength: 2,
    maxLength: 100,
  })
  @Transform(normalizeText)
  @IsOptional()
  @IsString({ message: 'El nombre debe ser texto.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres.' })
  name?: string;

  @ApiPropertyOptional({ enum: TeamDiscipline })
  @IsOptional()
  @IsEnum(TeamDiscipline, { message: 'La disciplina no es válida.' })
  discipline?: TeamDiscipline;

  @ApiPropertyOptional({ enum: TeamPrivacy })
  @IsOptional()
  @IsEnum(TeamPrivacy, { message: 'La privacidad no es válida.' })
  privacy?: TeamPrivacy;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description:
      'Permite que usuarios autenticados que no pertenecen al equipo consulten su perfil.',
  })
  @IsOptional()
  @IsBoolean({ message: 'La visibilidad para no miembros debe ser booleana.' })
  allowNonMembers?: boolean;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description:
      'Permite mostrar los integrantes aceptados a visitantes del perfil.',
  })
  @IsOptional()
  @IsBoolean({ message: 'La visibilidad de integrantes debe ser booleana.' })
  showMembers?: boolean;

  @ApiPropertyOptional({
    example: 'Ciudad de México',
    minLength: 2,
    maxLength: 120,
  })
  @Transform(normalizeText)
  @IsOptional()
  @IsString({ message: 'La ubicación debe ser texto.' })
  @MinLength(2, { message: 'La ubicación debe tener al menos 2 caracteres.' })
  @MaxLength(120, { message: 'La ubicación no puede exceder 120 caracteres.' })
  location?: string;

  @ApiPropertyOptional({ minLength: 10, maxLength: 500 })
  @Transform(normalizeText)
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto.' })
  @MinLength(10, {
    message: 'La descripción debe tener al menos 10 caracteres.',
  })
  @MaxLength(500, {
    message: 'La descripción no puede exceder 500 caracteres.',
  })
  description?: string;
}

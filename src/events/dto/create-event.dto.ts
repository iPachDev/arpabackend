import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  ArrayMaxSize,
  ArrayMinSize,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { EventDiscipline, EventType } from '../schemas/event.schema';
import { EventSessionDto } from './event-session.dto';

const normalizeText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

const optionalNumber = ({ value }: { value: unknown }) =>
  value === '' || value === null || value === undefined ? null : Number(value);

const optionalUrl = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class CreateEventDto {
  @ApiProperty({ example: 'Copa Metropolitana de Karting' })
  @Transform(normalizeText)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @ApiProperty({ enum: EventType, example: EventType.COMPETITION })
  @IsEnum(EventType)
  type: EventType;

  @ApiProperty({
    enum: EventDiscipline,
    example: EventDiscipline.KARTING,
  })
  @IsEnum(EventDiscipline)
  discipline: EventDiscipline;

  @ApiProperty({ minLength: 10, maxLength: 1000 })
  @Transform(normalizeText)
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @ApiProperty({
    type: EventSessionDto,
    isArray: true,
    description:
      'Una o varias fechas. Cada fecha puede usar una ubicación distinta o no tener ubicación.',
  })
  @ArrayMinSize(1, { message: 'Agrega al menos una fecha al evento.' })
  @ArrayMaxSize(50, { message: 'Un evento admite hasta 50 fechas.' })
  @ValidateNested({ each: true })
  @Type(() => EventSessionDto)
  sessions: EventSessionDto[];

  @ApiPropertyOptional({
    example: '2026-11-12T23:59:00.000Z',
    nullable: true,
  })
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  registrationDeadline?: Date | null;

  @ApiPropertyOptional({
    example: 60,
    minimum: 1,
    maximum: 100000,
    nullable: true,
  })
  @Transform(optionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  maxParticipants?: number | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/events/copa.jpg',
    nullable: true,
  })
  @Transform(optionalUrl)
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  imageUrl?: string | null;
}

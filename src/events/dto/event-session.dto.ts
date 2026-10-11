import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { EventLocationDto } from './event-location.dto';

export class EventSessionDto {
  @ApiProperty({ example: 'Clasificación', maxLength: 80 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: '2026-11-14T15:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  startsAt: Date;

  @ApiProperty({ example: '2026-11-14T20:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  endsAt: Date;

  @ApiPropertyOptional({ type: EventLocationDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => EventLocationDto)
  location?: EventLocationDto | null;
}

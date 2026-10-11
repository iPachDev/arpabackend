import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const normalizeText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class EventLocationDto {
  @ApiPropertyOptional({ example: 'gm-carso', nullable: true })
  @Transform(normalizeText)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceSlug?: string | null;

  @ApiProperty({ example: 'GM Carso', minLength: 2, maxLength: 120 })
  @Transform(normalizeText)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'Lago Zúrich 245, Ciudad de México' })
  @Transform(normalizeText)
  @IsString()
  @MinLength(4)
  @MaxLength(180)
  address: string;

  @ApiProperty({ example: 'Ciudad de México' })
  @Transform(normalizeText)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;
}

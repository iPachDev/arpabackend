import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { LocationDiscipline } from '../schemas/location.schema';

const normalizeText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
const optionalUrl = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class CreateLocationDto {
  @ApiProperty({ example: 'Kartódromo Ciudad ARPA' })
  @Transform(normalizeText)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'ARPA Racing' })
  @Transform(normalizeText)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  business: string;

  @ApiProperty({ enum: LocationDiscipline })
  @IsEnum(LocationDiscipline)
  discipline: LocationDiscipline;

  @ApiProperty({ example: 'Av. Ejemplo 100, Col. Centro' })
  @Transform(normalizeText)
  @IsString()
  @MinLength(5)
  @MaxLength(180)
  address: string;

  @ApiProperty({ example: 'Ciudad de México' })
  @Transform(normalizeText)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({ minLength: 10, maxLength: 1000 })
  @Transform(normalizeText)
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @ApiPropertyOptional({
    nullable: true,
    example: 'https://cdn.example.com/cover.jpg',
  })
  @Transform(optionalUrl)
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  coverImageUrl?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'https://cdn.example.com/map.jpg',
  })
  @Transform(optionalUrl)
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  circuitMapImageUrl?: string | null;

  @ApiPropertyOptional({ type: String, isArray: true, maxItems: 12 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { each: true },
  )
  @MaxLength(2048, { each: true })
  photoUrls?: string[];
}

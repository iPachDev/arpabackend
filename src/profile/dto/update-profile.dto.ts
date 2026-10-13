import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RacingInterest } from '../../users/schemas/user.schema';

const trimNullable = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return value;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized || null;
};

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Fernando Pacheco' })
  @Transform(trimNullable)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'iPach', nullable: true })
  @Transform(trimNullable)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'El alias sólo puede incluir letras, números, punto, guion y guion bajo.',
  })
  alias?: string | null;

  @ApiPropertyOptional({ example: '+525512345678' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value,
  )
  @IsOptional()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'El teléfono debe usar formato internacional.',
  })
  phone?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 280 })
  @Transform(trimNullable)
  @IsOptional()
  @IsString()
  @MaxLength(280)
  bio?: string | null;

  @ApiPropertyOptional({ example: 'Ciudad de México', nullable: true })
  @Transform(trimNullable)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string | null;

  @ApiPropertyOptional({ example: 'México', nullable: true })
  @Transform(trimNullable)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string | null;

  @ApiPropertyOptional({ example: 27, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  racingNumber?: number | null;

  @ApiPropertyOptional({ enum: RacingInterest, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsEnum(RacingInterest, { each: true })
  favoriteCategories?: RacingInterest[];
}

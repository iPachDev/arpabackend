import { ApiProperty } from '@nestjs/swagger';
import { RacingInterest } from '../../users/schemas/user.schema';

export class ProfileResponseDto {
  @ApiProperty({ example: '66f84cbd29d229e491a23362' })
  id: string;

  @ApiProperty({ example: 'Fernando Pacheco' })
  name: string;

  @ApiProperty({ example: 'fernando@example.com', readOnly: true })
  email: string;

  @ApiProperty({ example: '+525512345678' })
  phone: string;

  @ApiProperty({ example: 'iPach', nullable: true })
  alias: string | null;

  @ApiProperty({ example: 'Piloto amateur y fan del karting.', nullable: true })
  bio: string | null;

  @ApiProperty({ example: 'Ciudad de México', nullable: true })
  city: string | null;

  @ApiProperty({ example: 'México', nullable: true })
  country: string | null;

  @ApiProperty({ example: 27, nullable: true, minimum: 1, maximum: 999 })
  racingNumber: number | null;

  @ApiProperty({ enum: RacingInterest, isArray: true })
  favoriteCategories: RacingInterest[];

  @ApiProperty({ example: 'Ayrton Senna', nullable: true })
  favoriteDriver: string | null;

  @ApiProperty({ example: 'Autódromo Hermanos Rodríguez', nullable: true })
  favoriteTrack: string | null;

  @ApiProperty({ example: null, nullable: true, readOnly: true })
  avatarUrl: string | null;

  @ApiProperty({ example: null, nullable: true, readOnly: true })
  coverUrl: string | null;
}

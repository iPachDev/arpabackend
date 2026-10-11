import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class ArchiveTeamDto {
  @ApiProperty({
    example: 'ARPA Racing Team',
    description: 'Debe coincidir exactamente con el nombre actual del equipo.',
  })
  @IsString({ message: 'La confirmación debe ser texto.' })
  @MaxLength(100)
  confirmationName: string;
}

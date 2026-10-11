import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class ArchiveEventDto {
  @ApiProperty({
    example: 'Copa Metropolitana de Karting',
    description: 'Debe coincidir exactamente con el nombre actual del evento.',
  })
  @IsString({ message: 'La confirmación debe ser texto.' })
  @MaxLength(120)
  confirmationTitle: string;
}

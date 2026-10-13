import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsString } from 'class-validator';

export class DeactivateAccountDto {
  @ApiProperty({
    example: 'eliminar cuenta',
    description: 'Debe coincidir exactamente con “eliminar cuenta”.',
  })
  @IsString()
  @Equals('eliminar cuenta', {
    message: 'La confirmación debe ser exactamente “eliminar cuenta”.',
  })
  confirmation: string;
}

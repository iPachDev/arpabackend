import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';

export class CreateEventOwnershipTransferDto {
  @ApiProperty({ example: 'nuevo.owner@example.com', maxLength: 254 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @MaxLength(254)
  email: string;
}

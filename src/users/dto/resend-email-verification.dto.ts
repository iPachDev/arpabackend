import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendEmailVerificationDto {
  @ApiProperty({ example: 'fernando@example.com', maxLength: 254 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @MaxLength(254, { message: 'El correo electrónico es demasiado largo.' })
  email: string;
}

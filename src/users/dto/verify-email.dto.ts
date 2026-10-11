import { Transform } from 'class-transformer';
import { IsEmail, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ example: 'fernando@example.com', maxLength: 254 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @MaxLength(254, { message: 'El correo electrónico es demasiado largo.' })
  email: string;

  @ApiProperty({ example: '123456', pattern: '^\\d{6}$' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s/g, '') : value,
  )
  @Matches(/^\d{6}$/, { message: 'El código debe contener 6 dígitos.' })
  code: string;
}

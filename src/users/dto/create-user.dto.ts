import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Fernando Pacheco', minLength: 2, maxLength: 100 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString({ message: 'El nombre debe ser texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres.' })
  name: string;

  @ApiProperty({ example: 'fernando@example.com', maxLength: 254 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @MaxLength(254, { message: 'El correo electrónico es demasiado largo.' })
  email: string;

  @ApiProperty({
    example: '+525512345678',
    description: 'Número telefónico en formato internacional E.164.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value,
  )
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message:
      'El teléfono debe usar formato internacional, por ejemplo +525512345678.',
  })
  phone: string;

  @ApiProperty({ example: 'MiPassword123', minLength: 8, maxLength: 72 })
  @IsString({ message: 'La contraseña debe ser texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72, { message: 'La contraseña no puede exceder 72 caracteres.' })
  password: string;
}

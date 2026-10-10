import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'MiPasswordActual123', minLength: 8, maxLength: 72 })
  @IsString({ message: 'La contraseña actual debe ser texto.' })
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria.' })
  @MinLength(8, {
    message: 'La contraseña actual debe tener al menos 8 caracteres.',
  })
  @MaxLength(72, {
    message: 'La contraseña actual no puede exceder 72 caracteres.',
  })
  currentPassword: string;

  @ApiProperty({
    example: 'UnaNuevaClaveSegura123',
    minLength: 12,
    maxLength: 72,
  })
  @IsString({ message: 'La nueva contraseña debe ser texto.' })
  @MinLength(12, {
    message: 'La nueva contraseña debe tener al menos 12 caracteres.',
  })
  @MaxLength(72, {
    message: 'La nueva contraseña no puede exceder 72 caracteres.',
  })
  newPassword: string;

  @ApiProperty({
    example: 'UnaNuevaClaveSegura123',
    minLength: 12,
    maxLength: 72,
  })
  @IsString({ message: 'La confirmación debe ser texto.' })
  @MinLength(12, {
    message: 'La confirmación debe tener al menos 12 caracteres.',
  })
  @MaxLength(72, {
    message: 'La confirmación no puede exceder 72 caracteres.',
  })
  confirmPassword: string;
}

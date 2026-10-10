import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../schemas/user.schema';

export class UserResponseDto {
  @ApiProperty({ example: '66f84cbd29d229e491a23362' })
  id: string;

  @ApiProperty({ example: 'Fernando Pacheco' })
  name: string;

  @ApiProperty({ example: 'fernando@example.com' })
  email: string;

  @ApiProperty({ example: '+525512345678' })
  phone: string;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status: UserStatus;

  @ApiProperty({ enum: UserRole, example: UserRole.READER })
  role: UserRole;

  @ApiProperty({ example: '2026-09-27T12:00:00.000Z' })
  createdAt: Date;
}

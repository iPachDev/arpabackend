import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/schemas/user.schema';

export class AuthUserResponseDto {
  @ApiProperty({ example: '66f84cbd29d229e491a23362' })
  id: string;

  @ApiProperty({ example: 'Fernando Pacheco' })
  name: string;

  @ApiProperty({ example: 'fernando@example.com' })
  email: string;

  @ApiProperty({ enum: UserRole, example: UserRole.READER })
  role: UserRole;
}

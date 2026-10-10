import { ApiProperty } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({ example: '66f84cbd29d229e491a23362' })
  id: string;

  @ApiProperty({ example: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)' })
  userAgent: string;

  @ApiProperty({ example: '127.0.0.1' })
  ipAddress: string;

  @ApiProperty({ example: '2026-09-27T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-27T12:15:00.000Z' })
  lastSeenAt: Date;

  @ApiProperty({ example: '2026-10-04T12:00:00.000Z' })
  expiresAt: Date;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ example: true })
  current: boolean;
}

import { ApiProperty } from '@nestjs/swagger';

export class PrivateResourceResponseDto {
  @ApiProperty({
    example:
      'https://arpa.nyc3.digitaloceanspaces.com/profiles/user/cover/file.webp?X-Amz-Signature=...',
    description: 'URL temporal firmada. No debe persistirse ni compartirse.',
  })
  url: string;

  @ApiProperty({ example: '2026-10-11T18:05:00.000Z' })
  expiresAt: string;
}

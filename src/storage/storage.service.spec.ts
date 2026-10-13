import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  const configuration: Record<string, string> = {
    DIGITALOCEAN_SPACES_ENDPOINT: 'https://nyc3.digitaloceanspaces.com',
    DIGITALOCEAN_SPACES_REGION: 'nyc3',
    DIGITALOCEAN_SPACES_BUCKET: 'arpa-private',
    DIGITALOCEAN_SPACES_ACCESS_KEY: 'access-key',
    DIGITALOCEAN_SPACES_SECRET_KEY: 'secret-key',
  };

  afterEach(() => jest.restoreAllMocks());

  it('carga objetos con ACL privada y sin caché pública', async () => {
    const send = jest
      .spyOn(S3Client.prototype, 'send')
      .mockResolvedValue({} as never);
    const service = new StorageService({
      get: jest.fn((key: string) => configuration[key]),
    } as unknown as ConfigService);

    const key = await service.uploadPrivate({
      buffer: Buffer.from('image'),
      contentType: 'image/webp',
      directory: 'profiles/user-id/cover',
    });

    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command.input).toMatchObject({
      Bucket: 'arpa-private',
      ACL: 'private',
      CacheControl: 'private, no-store',
      ContentType: 'image/webp',
    });
    expect(key).toMatch(/^profiles\/user-id\/cover\/.+\.webp$/);
  });

  it('no permite usar almacenamiento sin la configuración completa', async () => {
    const service = new StorageService({
      get: jest.fn(() => ''),
    } as unknown as ConfigService);

    await expect(
      service.uploadPrivate({
        buffer: Buffer.from('image'),
        contentType: 'image/webp',
        directory: 'profiles/user-id/cover',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});

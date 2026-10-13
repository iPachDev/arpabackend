import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

export type PrivateUpload = {
  buffer: Buffer;
  contentType: string;
  directory: string;
};

@Injectable()
export class StorageService {
  private readonly bucket: string;
  private readonly client: S3Client | null;
  private readonly signedUrlTtlSeconds = 5 * 60;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>(
      'DIGITALOCEAN_SPACES_ENDPOINT',
    );
    const region = this.configService.get<string>('DIGITALOCEAN_SPACES_REGION');
    const accessKeyId = this.configService.get<string>(
      'DIGITALOCEAN_SPACES_ACCESS_KEY',
    );
    const secretAccessKey = this.configService.get<string>(
      'DIGITALOCEAN_SPACES_SECRET_KEY',
    );

    this.bucket =
      this.configService.get<string>('DIGITALOCEAN_SPACES_BUCKET') ?? '';
    this.client =
      endpoint && region && this.bucket && accessKeyId && secretAccessKey
        ? new S3Client({
            endpoint,
            region,
            credentials: { accessKeyId, secretAccessKey },
          })
        : null;
  }

  async uploadPrivate(upload: PrivateUpload): Promise<string> {
    const client = this.getClient();
    const extension = this.extensionFor(upload.contentType);
    const key = `${this.cleanDirectory(upload.directory)}/${randomUUID()}.${extension}`;

    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: upload.buffer,
        ContentType: upload.contentType,
        ACL: 'private',
        CacheControl: 'private, no-store',
      }),
    );

    return key;
  }

  async getSignedUrl(key: string): Promise<{ url: string; expiresAt: Date }> {
    const client = this.getClient();
    const expiresAt = new Date(Date.now() + this.signedUrlTtlSeconds * 1000);
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: this.signedUrlTtlSeconds },
    );

    return { url, expiresAt };
  }

  async delete(key: string): Promise<void> {
    await this.getClient().send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  private getClient(): S3Client {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'El almacenamiento privado no está configurado.',
      );
    }
    return this.client;
  }

  private cleanDirectory(directory: string): string {
    return directory.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '');
  }

  private extensionFor(contentType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    return extensions[contentType] ?? 'bin';
  }
}

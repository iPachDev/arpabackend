import { FileValidator } from '@nestjs/common';

export class PrivateImageValidator extends FileValidator<
  Record<string, never>,
  Express.Multer.File
> {
  constructor() {
    super({});
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file?.buffer) return false;

    const signatures: Record<string, boolean> = {
      'image/jpeg':
        file.buffer[0] === 0xff &&
        file.buffer[1] === 0xd8 &&
        file.buffer[2] === 0xff,
      'image/png':
        file.buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a',
      'image/webp':
        file.buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        file.buffer.subarray(8, 12).toString('ascii') === 'WEBP',
    };

    return signatures[file.mimetype] === true;
  }

  buildErrorMessage(): string {
    return 'El archivo debe ser una imagen JPG, PNG o WebP válida.';
  }
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    if (request.headers['sec-fetch-site'] === 'cross-site') {
      throw new ForbiddenException('Origen de la solicitud no permitido.');
    }

    const origin = request.headers.origin;
    if (!origin) {
      return true;
    }

    const configuredOrigins = this.configService
      .get<string>('CORS_ORIGIN', 'http://localhost:3000')
      .split(',')
      .map((value) => value.trim());
    const ownOrigin = `${request.protocol}://${request.get('host')}`;

    if (![...configuredOrigins, ownOrigin].includes(origin)) {
      throw new ForbiddenException('Origen de la solicitud no permitido.');
    }

    return true;
  }
}

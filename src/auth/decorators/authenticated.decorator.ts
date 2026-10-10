import { applyDecorators } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiExtension,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export const SESSION_AUTH_NAME = 'session-cookie';

export function Authenticated() {
  return applyDecorators(
    ApiCookieAuth(SESSION_AUTH_NAME),
    ApiExtension('x-authentication-required', true),
    ApiUnauthorizedResponse({
      description: 'La sesión no existe, expiró o fue revocada.',
    }),
  );
}

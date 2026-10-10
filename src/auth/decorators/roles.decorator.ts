import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiExtension, ApiForbiddenResponse } from '@nestjs/swagger';
import { UserRole } from '../../users/schemas/user.schema';
import { Authenticated } from './authenticated.decorator';

export const ROLES_KEY = 'roles';

export function Roles(...roles: UserRole[]) {
  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    Authenticated(),
    ApiExtension('x-required-roles', roles),
    ApiForbiddenResponse({
      description: `Roles permitidos: ${roles.join(', ')}.`,
    }),
  );
}

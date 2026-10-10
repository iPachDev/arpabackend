import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { UserRole } from '../users/schemas/user.schema';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('Profile / Party Reference Data Directory')
@Controller({ path: 'profile', version: '1' })
@Roles(UserRole.OWNER, UserRole.EDITOR, UserRole.READER)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'getMyProfile',
    summary: 'Consultar mi perfil',
    description:
      'Consulta los datos personales y preferencias del usuario autenticado.',
  })
  @ApiOkResponse({ type: ProfileResponseDto })
  get(@Req() request: AuthenticatedRequest): Promise<ProfileResponseDto> {
    return this.profileService.get(request.user.id);
  }

  @Patch()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'updateMyProfile',
    summary: 'Actualizar mi perfil',
    description:
      'Actualiza únicamente campos editables. El correo y el rol no forman parte del contrato.',
  })
  @ApiOkResponse({ type: ProfileResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profileService.update(request.user.id, updateProfileDto);
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    operationId: 'changeMyPassword',
    summary: 'Cambiar mi contraseña',
    description:
      'Verifica la contraseña actual, guarda la nueva con bcrypt y revoca las demás sesiones del usuario.',
  })
  @ApiNoContentResponse({ description: 'Contraseña actualizada.' })
  @ApiUnauthorizedResponse({
    description: 'La sesión o la contraseña actual no son válidas.',
  })
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    return this.profileService.changePassword(
      request.user.id,
      request.user.sessionId,
      changePasswordDto,
    );
  }
}

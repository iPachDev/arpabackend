import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Patch,
  ParseFilePipe,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiConsumes,
  ApiExtension,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { CookieOptions, Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { UserRole } from '../users/schemas/user.schema';
import { PrivateImageValidator } from '../storage/private-image.validator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeactivateAccountDto } from './dto/deactivate-account.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { PrivateResourceResponseDto } from './dto/private-resource-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('Profile / Party Reference Data Directory')
@Controller({ path: 'profile', version: '1' })
@Roles(UserRole.OWNER, UserRole.EDITOR, UserRole.READER)
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly configService: ConfigService,
  ) {}

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

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiExtension('x-bian-service-domain', 'Party Reference Data Directory')
  @ApiExtension('x-bian-action-term', 'Update')
  @ApiOperation({
    operationId: 'uploadMyProfileAvatar',
    summary: 'Cambiar mi foto de perfil',
    description:
      'Carga una imagen privada en DigitalOcean Spaces y devuelve una URL firmada temporal. Requiere sesión activa.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: PrivateResourceResponseDto })
  uploadAvatar(
    @Req() request: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new PrivateImageValidator(),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<PrivateResourceResponseDto> {
    return this.profileService.updateAvatar(request.user.id, file);
  }

  @Get('avatar')
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Party Reference Data Directory')
  @ApiExtension('x-bian-action-term', 'Retrieve')
  @ApiOperation({
    operationId: 'getMySignedProfileAvatar',
    summary: 'Obtener mi foto de perfil firmada',
    description:
      'Emite una URL de lectura válida durante cinco minutos. Solo está disponible con sesión activa.',
  })
  @ApiOkResponse({ type: PrivateResourceResponseDto })
  getAvatar(
    @Req() request: AuthenticatedRequest,
  ): Promise<PrivateResourceResponseDto> {
    return this.profileService.getSignedAvatar(request.user.id);
  }

  @Post('cover')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiExtension('x-bian-service-domain', 'Party Reference Data Directory')
  @ApiExtension('x-bian-action-term', 'Update')
  @ApiOperation({
    operationId: 'uploadMyProfileCover',
    summary: 'Cambiar mi foto de portada',
    description:
      'Carga una imagen privada en DigitalOcean Spaces y devuelve una URL firmada temporal. Requiere sesión activa.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: PrivateResourceResponseDto })
  uploadCover(
    @Req() request: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new PrivateImageValidator(),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<PrivateResourceResponseDto> {
    return this.profileService.updateCover(request.user.id, file);
  }

  @Get('cover')
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Party Reference Data Directory')
  @ApiExtension('x-bian-action-term', 'Retrieve')
  @ApiOperation({
    operationId: 'getMySignedProfileCover',
    summary: 'Obtener mi portada firmada',
    description:
      'Emite una URL de lectura válida durante cinco minutos. Solo está disponible con sesión activa.',
  })
  @ApiOkResponse({ type: PrivateResourceResponseDto })
  getCover(
    @Req() request: AuthenticatedRequest,
  ): Promise<PrivateResourceResponseDto> {
    return this.profileService.getSignedCover(request.user.id);
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

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiExtension('x-bian-service-domain', 'Party Reference Data Directory')
  @ApiExtension('x-bian-action-term', 'Control')
  @ApiOperation({
    operationId: 'deactivateMyAccount',
    summary: 'Dar de baja mi cuenta',
    description:
      'Desactiva la cuenta mediante baja lógica y revoca todas sus sesiones. Requiere la frase exacta de confirmación.',
  })
  @ApiNoContentResponse({
    description: 'Cuenta desactivada y sesiones revocadas.',
  })
  @ApiBadRequestResponse({
    description: 'La frase de confirmación no coincide.',
  })
  async deactivateAccount(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: DeactivateAccountDto,
  ): Promise<void> {
    await this.profileService.deactivateAccount(request.user.id, dto);
    response.clearCookie(this.cookieName, this.cookieOptions());
  }

  private get cookieName(): string {
    return this.configService.get<string>(
      'SESSION_COOKIE_NAME',
      'arpa_session',
    );
  }

  private cookieOptions(): CookieOptions {
    const domain = this.configService.get<string>('SESSION_COOKIE_DOMAIN');
    const options: CookieOptions = {
      httpOnly: true,
      secure:
        this.configService.get<string>('NODE_ENV', 'development') ===
        'production',
      sameSite: 'strict',
      path: '/',
    };
    if (domain?.trim()) options.domain = domain.trim();
    return options;
  }
}

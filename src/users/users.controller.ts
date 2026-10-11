import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ResendEmailVerificationDto } from './dto/resend-email-verification.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ErrorResponseDto } from './dto/error-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UsersService } from './users.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Users / Customer Access Entitlement')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    operationId: 'createUser',
    summary: 'Registrar un usuario',
    description:
      'Crea el perfil inicial de acceso del usuario. Adaptación ligera del Service Domain Customer Access Entitlement de BIAN.',
  })
  @ApiCreatedResponse({
    description: 'Usuario registrado correctamente.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Los datos enviados no cumplen el contrato.',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'El correo o teléfono ya está registrado.',
    type: ErrorResponseDto,
  })
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Post('verify-email')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'verifyUserEmail',
    summary: 'Confirmar el correo de un usuario',
  })
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<UserResponseDto> {
    return this.usersService.verifyEmail(dto);
  }

  @Post('resend-verification')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'resendUserEmailVerification',
    summary: 'Reenviar el código de confirmación',
  })
  resendVerification(@Body() dto: ResendEmailVerificationDto): Promise<void> {
    return this.usersService.resendEmailVerification(dto.email);
  }
}

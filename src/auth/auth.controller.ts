import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CookieOptions, Request, Response } from 'express';
import { SessionResponseDto } from '../sessions/dto/session-response.dto';
import { UserRole } from '../users/schemas/user.schema';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { AuthUserResponseDto } from './dto/auth-user-response.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    operationId: 'login',
    summary: 'Iniciar sesión',
    description:
      'Valida las credenciales, crea una sesión persistente y entrega una cookie HttpOnly. Ruta pública con límite de intentos.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Credenciales incorrectas.' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.authService.login(loginDto, {
      userAgent: request.get('user-agent') ?? 'Desconocido',
      ipAddress: request.ip,
    });

    response.cookie(
      this.cookieName,
      result.sessionToken,
      this.cookieOptions(result.expiresAt),
    );

    return { user: result.user, expiresAt: result.expiresAt };
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  @Roles(UserRole.OWNER, UserRole.EDITOR, UserRole.READER)
  @ApiOperation({
    operationId: 'getCurrentUser',
    summary: 'Consultar el usuario autenticado',
  })
  @ApiOkResponse({ type: AuthUserResponseDto })
  currentUser(@Req() request: AuthenticatedRequest): AuthUserResponseDto {
    const { id, name, email, role } = request.user;
    return { id, name, email, role };
  }

  @Get('sessions')
  @Header('Cache-Control', 'no-store')
  @Roles(UserRole.OWNER, UserRole.EDITOR, UserRole.READER)
  @ApiOperation({
    operationId: 'listMySessions',
    summary: 'Consultar las sesiones del usuario autenticado',
    description:
      'Lista sesiones vigentes y revocadas aún no expiradas. Marca la sesión que realiza la consulta.',
  })
  @ApiOkResponse({ type: SessionResponseDto, isArray: true })
  sessions(
    @Req() request: AuthenticatedRequest,
  ): Promise<SessionResponseDto[]> {
    return this.authService.listSessions(request.user);
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'logout',
    summary: 'Cerrar la sesión actual',
    description:
      'Operación idempotente: revoca la sesión si la cookie existe y siempre solicita al navegador eliminarla.',
  })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = request.cookies?.[this.cookieName] as string | undefined;
    if (token) {
      await this.authService.logout(token);
    }
    response.clearCookie(this.cookieName, this.cookieOptions());
  }

  private get cookieName(): string {
    return this.configService.get<string>(
      'SESSION_COOKIE_NAME',
      'arpa_session',
    );
  }

  private cookieOptions(expires?: Date): CookieOptions {
    const domain = this.configService.get<string>('SESSION_COOKIE_DOMAIN');
    const options: CookieOptions = {
      httpOnly: true,
      secure:
        this.configService.get<string>('NODE_ENV', 'development') ===
        'production',
      sameSite: 'strict',
      path: '/',
    };

    if (expires) {
      options.expires = expires;
    }
    if (domain?.trim()) {
      options.domain = domain.trim();
    }

    return options;
  }
}

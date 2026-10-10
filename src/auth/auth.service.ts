import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hashSync } from 'bcryptjs';
import { SessionResponseDto } from '../sessions/dto/session-response.dto';
import { SessionsService } from '../sessions/sessions.service';
import { UserRole, UserStatus } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';

type LoginResult = LoginResponseDto & {
  sessionToken: string;
};

type SessionMetadata = {
  userAgent: string;
  ipAddress: string;
};

@Injectable()
export class AuthService {
  private readonly dummyPasswordHash: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    configService: ConfigService,
  ) {
    const rounds = Number(
      configService.get<string>('BCRYPT_SALT_ROUNDS', '12'),
    );
    this.dummyPasswordHash = hashSync('invalid-password-placeholder', rounds);
  }

  async login(
    loginDto: LoginDto,
    metadata: SessionMetadata,
  ): Promise<LoginResult> {
    const user = await this.usersService.findByEmailForAuthentication(
      loginDto.email,
    );
    const passwordIsValid = await compare(
      loginDto.password,
      user?.passwordHash ?? this.dummyPasswordHash,
    );

    if (!user || !passwordIsValid || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const session = await this.sessionsService.create(
      user._id.toString(),
      metadata,
    );

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role ?? UserRole.READER,
      },
      expiresAt: session.expiresAt,
      sessionToken: session.token,
    };
  }

  async authenticateSession(token: string): Promise<AuthenticatedUser> {
    const session = await this.sessionsService.findActiveByToken(token);
    if (!session) {
      throw new UnauthorizedException('La sesión no es válida.');
    }

    const user = await this.usersService.findByIdForAuthentication(
      session.userId.toString(),
    );
    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.sessionsService.revokeByToken(token);
      throw new UnauthorizedException('La sesión no es válida.');
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role ?? UserRole.READER,
      sessionId: session._id.toString(),
    };
  }

  listSessions(user: AuthenticatedUser): Promise<SessionResponseDto[]> {
    return this.sessionsService.listForUser(user.id, user.sessionId);
  }

  logout(token: string): Promise<void> {
    return this.sessionsService.revokeByToken(token);
  }
}

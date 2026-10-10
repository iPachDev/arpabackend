import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { Types } from 'mongoose';
import { SessionsService } from '../sessions/sessions.service';
import { UserRole, UserStatus } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const usersService = {
    findByEmailForAuthentication: jest.fn(),
    findByIdForAuthentication: jest.fn(),
  };
  const sessionsService = {
    create: jest.fn(),
    findActiveByToken: jest.fn(),
    revokeByToken: jest.fn(),
    listForUser: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: SessionsService, useValue: sessionsService },
        { provide: ConfigService, useValue: { get: jest.fn(() => '4') } },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  it('crea una sesión cuando las credenciales son válidas', async () => {
    const userId = new Types.ObjectId();
    usersService.findByEmailForAuthentication.mockResolvedValue({
      _id: userId,
      name: 'Fernando Pacheco',
      email: 'fernando@example.com',
      passwordHash: await hash('MiPassword123', 4),
      status: UserStatus.ACTIVE,
      role: UserRole.READER,
    });
    sessionsService.create.mockResolvedValue({
      token: 'secret-session-token',
      expiresAt: new Date('2026-10-04T12:00:00.000Z'),
    });

    const result = await service.login(
      { email: 'fernando@example.com', password: 'MiPassword123' },
      { userAgent: 'Jest', ipAddress: '127.0.0.1' },
    );

    expect(sessionsService.create).toHaveBeenCalledWith(userId.toString(), {
      userAgent: 'Jest',
      ipAddress: '127.0.0.1',
    });
    expect(result.sessionToken).toBe('secret-session-token');
    expect(result.user.role).toBe(UserRole.READER);
  });

  it('usa el mismo error para usuario inexistente o contraseña incorrecta', async () => {
    usersService.findByEmailForAuthentication.mockResolvedValue(null);

    await expect(
      service.login(
        { email: 'unknown@example.com', password: 'MiPassword123' },
        { userAgent: 'Jest', ipAddress: '127.0.0.1' },
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(sessionsService.create).not.toHaveBeenCalled();
  });

  it('rechaza una sesión revocada o expirada', async () => {
    sessionsService.findActiveByToken.mockResolvedValue(null);

    await expect(service.authenticateSession('invalid-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { compare, hash } from 'bcryptjs';
import { Types } from 'mongoose';
import { EmailService } from '../email/email.service';
import { User, UserRole, UserStatus } from './schemas/user.schema';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const findOneExec = jest.fn();
  const userModel = {
    create: jest.fn(),
    findOne: jest.fn(() => ({
      select: jest.fn(() => ({ exec: findOneExec })),
    })),
  };
  const emailService = { sendAccountVerification: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: userModel },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) =>
              key === 'EMAIL_VERIFICATION_TTL_MINUTES'
                ? '10'
                : (defaultValue ?? '4'),
            ),
          },
        },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get(UsersService);
    jest.clearAllMocks();
    findOneExec.mockReset();
    userModel.create.mockReset();
    emailService.sendAccountVerification.mockReset();
  });

  it('crea un usuario con la contraseña protegida y no devuelve el hash', async () => {
    const id = new Types.ObjectId();
    findOneExec.mockResolvedValue(null);
    userModel.create.mockImplementation(async (data) => ({
      _id: id,
      ...data,
      role: UserRole.READER,
      createdAt: new Date('2026-09-27T12:00:00.000Z'),
    }));
    emailService.sendAccountVerification.mockResolvedValue('email-id');

    const result = await service.create({
      name: 'Fernando Pacheco',
      email: 'fernando@example.com',
      phone: '+525512345678',
      password: 'MiPassword123',
    });

    const storedData = userModel.create.mock.calls[0][0];
    expect(storedData.passwordHash).not.toBe('MiPassword123');
    await expect(
      compare('MiPassword123', storedData.passwordHash),
    ).resolves.toBe(true);
    expect(result).toEqual({
      id: id.toString(),
      name: 'Fernando Pacheco',
      email: 'fernando@example.com',
      phone: '+525512345678',
      status: UserStatus.PENDING_VERIFICATION,
      role: UserRole.READER,
      createdAt: new Date('2026-09-27T12:00:00.000Z'),
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(emailService.sendAccountVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'fernando@example.com',
        userName: 'Fernando Pacheco',
        code: expect.stringMatching(/^\d{6}$/),
        expiresInMinutes: 10,
      }),
    );
  });

  it('rechaza un correo o teléfono ya registrado', async () => {
    findOneExec.mockResolvedValue({
      _id: new Types.ObjectId(),
      email: 'fernando@example.com',
      status: UserStatus.ACTIVE,
    });

    await expect(
      service.create({
        name: 'Fernando Pacheco',
        email: 'fernando@example.com',
        phone: '+525512345678',
        password: 'MiPassword123',
      }),
    ).rejects.toThrow(ConflictException);

    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('convierte una colisión del índice único en conflicto', async () => {
    findOneExec.mockResolvedValue(null);
    userModel.create.mockRejectedValue({ code: 11000 });

    await expect(
      service.create({
        name: 'Fernando Pacheco',
        email: 'fernando@example.com',
        phone: '+525512345678',
        password: 'MiPassword123',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('reenvía el OTP al repetir el registro de una cuenta pendiente', async () => {
    const pendingUser = {
      _id: new Types.ObjectId(),
      name: 'Fernando Pacheco',
      email: 'fernando@example.com',
      phone: '+525512345678',
      status: UserStatus.PENDING_VERIFICATION,
      role: UserRole.READER,
      emailVerificationSentAt: new Date(Date.now() - 61_000),
      createdAt: new Date('2026-09-27T12:00:00.000Z'),
      save: jest.fn(),
    };
    findOneExec.mockResolvedValue(pendingUser);
    emailService.sendAccountVerification.mockResolvedValue('email-id');

    const result = await service.create({
      name: 'Nombre diferente',
      email: pendingUser.email,
      phone: pendingUser.phone,
      password: 'OtraPassword123',
    });

    expect(userModel.create).not.toHaveBeenCalled();
    expect(pendingUser.name).toBe('Fernando Pacheco');
    expect(pendingUser.save).toHaveBeenCalled();
    expect(emailService.sendAccountVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: pendingUser.email,
        code: expect.stringMatching(/^\d{6}$/),
      }),
    );
    expect(result.status).toBe(UserStatus.PENDING_VERIFICATION);
  });

  it('activa la cuenta cuando el OTP es correcto', async () => {
    const code = '123456';
    const user = {
      _id: new Types.ObjectId(),
      name: 'Fernando Pacheco',
      email: 'fernando@example.com',
      phone: '+525512345678',
      status: UserStatus.PENDING_VERIFICATION,
      role: UserRole.READER,
      emailVerificationCodeHash: await hash(code, 4),
      emailVerificationExpiresAt: new Date(Date.now() + 60_000),
      emailVerificationAttempts: 0,
      emailVerifiedAt: null,
      createdAt: new Date('2026-09-27T12:00:00.000Z'),
      save: jest.fn(),
    };
    findOneExec.mockResolvedValue(user);

    const result = await service.verifyEmail({
      email: user.email,
      code,
    });

    expect(user.status).toBe(UserStatus.ACTIVE);
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(user.emailVerificationCodeHash).toBeNull();
    expect(user.save).toHaveBeenCalled();
    expect(result.status).toBe(UserStatus.ACTIVE);
  });

  it('rechaza un OTP incorrecto y registra el intento', async () => {
    const user = {
      emailVerificationCodeHash: await hash('123456', 4),
      emailVerificationExpiresAt: new Date(Date.now() + 60_000),
      emailVerificationAttempts: 0,
      save: jest.fn(),
    };
    findOneExec.mockResolvedValue(user);

    await expect(
      service.verifyEmail({
        email: 'fernando@example.com',
        code: '654321',
      }),
    ).rejects.toThrow('El código de verificación no es válido.');

    expect(user.emailVerificationAttempts).toBe(1);
    expect(user.save).toHaveBeenCalled();
  });
});

import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { compare } from 'bcryptjs';
import { Types } from 'mongoose';
import { User, UserRole, UserStatus } from './schemas/user.schema';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const exec = jest.fn();
  const userModel = {
    exists: jest.fn(() => ({ exec })),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: userModel },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => '4') },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  it('crea un usuario con la contraseña protegida y no devuelve el hash', async () => {
    const id = new Types.ObjectId();
    exec.mockResolvedValue(null);
    userModel.create.mockImplementation(async (data) => ({
      _id: id,
      ...data,
      status: UserStatus.ACTIVE,
      role: UserRole.READER,
      createdAt: new Date('2026-09-27T12:00:00.000Z'),
    }));

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
      status: UserStatus.ACTIVE,
      role: UserRole.READER,
      createdAt: new Date('2026-09-27T12:00:00.000Z'),
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rechaza un correo o teléfono ya registrado', async () => {
    exec.mockResolvedValue({ _id: new Types.ObjectId() });

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
    exec.mockResolvedValue(null);
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
});

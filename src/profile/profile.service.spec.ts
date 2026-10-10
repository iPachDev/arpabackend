import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { compare, hashSync } from 'bcryptjs';
import { Types } from 'mongoose';
import { SessionsService } from '../sessions/sessions.service';
import { RacingInterest, User } from '../users/schemas/user.schema';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let service: ProfileService;
  const findByIdExec = jest.fn();
  const updateExec = jest.fn();
  const findByIdQuery = {
    select: jest.fn(),
    exec: findByIdExec,
  };
  findByIdQuery.select.mockReturnValue(findByIdQuery);
  const userModel = {
    findById: jest.fn(() => findByIdQuery),
    findByIdAndUpdate: jest.fn(() => ({ exec: updateExec })),
  };
  const sessionsService = { revokeOthersForUser: jest.fn() };

  const user = {
    _id: new Types.ObjectId(),
    name: 'Fernando Pacheco',
    email: 'fernando@example.com',
    phone: '+525512345678',
    alias: 'fer.racing',
    bio: null,
    city: 'Ciudad de México',
    country: 'México',
    racingNumber: 27,
    favoriteCategories: [RacingInterest.KARTING],
    favoriteDriver: null,
    favoriteTrack: null,
    avatarUrl: null,
    coverUrl: null,
    passwordHash: 'never-return-this',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: SessionsService, useValue: sessionsService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => '4') },
        },
      ],
    }).compile();

    service = module.get(ProfileService);
    jest.clearAllMocks();
  });

  it('devuelve solamente los campos seguros del perfil', async () => {
    findByIdExec.mockResolvedValue(user);

    const result = await service.get(user._id.toString());

    expect(result.email).toBe(user.email);
    expect(result.favoriteCategories).toEqual([RacingInterest.KARTING]);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('actualiza parcialmente el perfil con validadores de MongoDB', async () => {
    updateExec.mockResolvedValue({ ...user, alias: 'ipach' });

    const result = await service.update(user._id.toString(), {
      alias: 'ipach',
    });

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      user._id.toString(),
      { $set: { alias: 'ipach' } },
      { new: true, runValidators: true },
    );
    expect(result.alias).toBe('ipach');
  });

  it('responde 404 cuando el perfil no existe', async () => {
    findByIdExec.mockResolvedValue(null);

    await expect(service.get(user._id.toString())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('convierte una colisión de teléfono en conflicto', async () => {
    updateExec.mockRejectedValue({ code: 11000 });

    await expect(
      service.update(user._id.toString(), { phone: '+525500000000' }),
    ).rejects.toThrow(ConflictException);
  });

  it('cifra la nueva contraseña y revoca las demás sesiones', async () => {
    const authenticatedUser = {
      ...user,
      passwordHash: hashSync('PasswordActual123', 4),
      save: jest.fn(),
    };
    findByIdExec.mockResolvedValue(authenticatedUser);

    await service.changePassword(user._id.toString(), 'current-session', {
      currentPassword: 'PasswordActual123',
      newPassword: 'PasswordNueva456',
      confirmPassword: 'PasswordNueva456',
    });

    await expect(
      compare('PasswordNueva456', authenticatedUser.passwordHash),
    ).resolves.toBe(true);
    expect(authenticatedUser.save).toHaveBeenCalled();
    expect(sessionsService.revokeOthersForUser).toHaveBeenCalledWith(
      user._id.toString(),
      'current-session',
    );
  });

  it('rechaza una contraseña actual incorrecta sin guardar cambios', async () => {
    const authenticatedUser = {
      ...user,
      passwordHash: hashSync('PasswordActual123', 4),
      save: jest.fn(),
    };
    findByIdExec.mockResolvedValue(authenticatedUser);

    await expect(
      service.changePassword(user._id.toString(), 'current-session', {
        currentPassword: 'PasswordErronea123',
        newPassword: 'PasswordNueva456',
        confirmPassword: 'PasswordNueva456',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(authenticatedUser.save).not.toHaveBeenCalled();
    expect(sessionsService.revokeOthersForUser).not.toHaveBeenCalled();
  });
});

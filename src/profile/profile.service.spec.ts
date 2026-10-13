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
import { StorageService } from '../storage/storage.service';
import { RacingInterest, User, UserStatus } from '../users/schemas/user.schema';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let service: ProfileService;
  const findByIdExec = jest.fn();
  const updateExec = jest.fn();
  const updateQuery = {
    select: jest.fn(),
    exec: updateExec,
  };
  updateQuery.select.mockReturnValue(updateQuery);
  const findByIdQuery = {
    select: jest.fn(),
    exec: findByIdExec,
  };
  findByIdQuery.select.mockReturnValue(findByIdQuery);
  const userModel = {
    findById: jest.fn(() => findByIdQuery),
    findByIdAndUpdate: jest.fn(() => updateQuery),
  };
  const sessionsService = {
    revokeOthersForUser: jest.fn(),
    revokeAllForUser: jest.fn(),
  };
  const storageService = {
    uploadPrivate: jest.fn(),
    getSignedUrl: jest.fn(),
    delete: jest.fn(),
  };

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
    avatarObjectKey: null,
    coverObjectKey: null,
    passwordHash: 'never-return-this',
    status: UserStatus.ACTIVE,
    deactivatedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: SessionsService, useValue: sessionsService },
        { provide: StorageService, useValue: storageService },
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

  it('sube la portada como recurso privado y guarda solamente su clave', async () => {
    const persistedUser = { ...user, save: jest.fn() };
    findByIdExec.mockResolvedValue(persistedUser);
    storageService.uploadPrivate.mockResolvedValue(
      `profiles/${user._id}/cover/private.webp`,
    );
    storageService.getSignedUrl.mockResolvedValue({
      url: 'https://spaces.example/private.webp?signature=valid',
      expiresAt: new Date('2026-10-11T18:05:00.000Z'),
    });

    const result = await service.updateCover(user._id.toString(), {
      buffer: Buffer.from('image'),
      mimetype: 'image/webp',
    } as Express.Multer.File);

    expect(storageService.uploadPrivate).toHaveBeenCalledWith({
      buffer: expect.any(Buffer),
      contentType: 'image/webp',
      directory: `profiles/${user._id}/cover`,
    });
    expect(persistedUser.coverObjectKey).toContain('/cover/private.webp');
    expect(persistedUser.save).toHaveBeenCalled();
    expect(result.url).toContain('signature=valid');
  });

  it('sube el avatar como recurso privado y guarda solamente su clave', async () => {
    const persistedUser = { ...user, save: jest.fn() };
    findByIdExec.mockResolvedValue(persistedUser);
    storageService.uploadPrivate.mockResolvedValue(
      `profiles/${user._id}/avatar/private.webp`,
    );
    storageService.getSignedUrl.mockResolvedValue({
      url: 'https://spaces.example/avatar.webp?signature=valid',
      expiresAt: new Date('2026-10-11T18:05:00.000Z'),
    });

    const result = await service.updateAvatar(user._id.toString(), {
      buffer: Buffer.from('image'),
      mimetype: 'image/webp',
    } as Express.Multer.File);

    expect(storageService.uploadPrivate).toHaveBeenCalledWith({
      buffer: expect.any(Buffer),
      contentType: 'image/webp',
      directory: `profiles/${user._id}/avatar`,
    });
    expect(persistedUser.avatarObjectKey).toContain('/avatar/private.webp');
    expect(persistedUser.save).toHaveBeenCalled();
    expect(result.url).toContain('signature=valid');
  });

  it('da de baja la cuenta y revoca todas sus sesiones', async () => {
    const persistedUser = { ...user, save: jest.fn() };
    findByIdExec.mockResolvedValue(persistedUser);

    await service.deactivateAccount(user._id.toString(), {
      confirmation: 'eliminar cuenta',
    });

    expect(persistedUser.status).toBe(UserStatus.DISABLED);
    expect(persistedUser.deactivatedAt).toBeInstanceOf(Date);
    expect(persistedUser.save).toHaveBeenCalled();
    expect(sessionsService.revokeAllForUser).toHaveBeenCalledWith(
      user._id.toString(),
    );
  });
});

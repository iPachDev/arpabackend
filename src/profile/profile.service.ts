import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { compare, hash } from 'bcryptjs';
import { Model } from 'mongoose';
import { SessionsService } from '../sessions/sessions.service';
import { StorageService } from '../storage/storage.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UserStatus } from '../users/schemas/user.schema';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeactivateAccountDto } from './dto/deactivate-account.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { PrivateResourceResponseDto } from './dto/private-resource-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly sessionsService: SessionsService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {}

  async get(userId: string): Promise<ProfileResponseDto> {
    const user = await this.userModel
      .findById(userId)
      .select('+avatarObjectKey +coverObjectKey')
      .exec();
    if (!user) throw new NotFoundException('El perfil no existe.');
    return this.toResponse(user);
  }

  async update(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    try {
      const user = await this.userModel
        .findByIdAndUpdate(
          userId,
          { $set: updateProfileDto },
          {
            new: true,
            runValidators: true,
          },
        )
        .select('+avatarObjectKey +coverObjectKey')
        .exec();

      if (!user) throw new NotFoundException('El perfil no existe.');
      return this.toResponse(user);
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('El teléfono ya está registrado.');
      }
      throw error;
    }
  }

  async updateCover(
    userId: string,
    file: Express.Multer.File,
  ): Promise<PrivateResourceResponseDto> {
    return this.updatePrivateImage(userId, file, 'coverObjectKey', 'cover');
  }

  async updateAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<PrivateResourceResponseDto> {
    return this.updatePrivateImage(userId, file, 'avatarObjectKey', 'avatar');
  }

  async getSignedCover(userId: string): Promise<PrivateResourceResponseDto> {
    return this.getSignedPrivateImage(
      userId,
      'coverObjectKey',
      'El perfil no tiene una portada.',
    );
  }

  async getSignedAvatar(userId: string): Promise<PrivateResourceResponseDto> {
    return this.getSignedPrivateImage(
      userId,
      'avatarObjectKey',
      'El perfil no tiene una foto.',
    );
  }

  private async updatePrivateImage(
    userId: string,
    file: Express.Multer.File,
    field: 'avatarObjectKey' | 'coverObjectKey',
    directory: 'avatar' | 'cover',
  ): Promise<PrivateResourceResponseDto> {
    const user = await this.userModel
      .findById(userId)
      .select(`+${field}`)
      .exec();
    if (!user) throw new NotFoundException('El perfil no existe.');

    const previousKey = user[field];
    const key = await this.storageService.uploadPrivate({
      buffer: file.buffer,
      contentType: file.mimetype,
      directory: `profiles/${userId}/${directory}`,
    });

    try {
      user[field] = key;
      await user.save();
    } catch (error) {
      await this.storageService.delete(key).catch(() => undefined);
      throw error;
    }

    if (previousKey) {
      await this.storageService.delete(previousKey).catch(() => undefined);
    }
    return this.signResource(key);
  }

  private async getSignedPrivateImage(
    userId: string,
    field: 'avatarObjectKey' | 'coverObjectKey',
    missingMessage: string,
  ): Promise<PrivateResourceResponseDto> {
    const user = await this.userModel
      .findById(userId)
      .select(`+${field}`)
      .exec();
    if (!user) throw new NotFoundException('El perfil no existe.');
    if (!user[field]) {
      throw new NotFoundException(missingMessage);
    }
    return this.signResource(user[field]);
  }

  async changePassword(
    userId: string,
    currentSessionId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.userModel
      .findById(userId)
      .select('+passwordHash')
      .exec();

    if (!user) throw new NotFoundException('El perfil no existe.');

    const currentPasswordIsValid = await compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );
    if (!currentPasswordIsValid) {
      throw new UnauthorizedException('La contraseña actual no es correcta.');
    }

    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException('Las contraseñas nuevas no coinciden.');
    }

    if (await compare(changePasswordDto.newPassword, user.passwordHash)) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual.',
      );
    }

    const saltRounds = Number(
      this.configService.get<string>('BCRYPT_SALT_ROUNDS', '12'),
    );
    user.passwordHash = await hash(changePasswordDto.newPassword, saltRounds);
    await user.save();
    await this.sessionsService.revokeOthersForUser(userId, currentSessionId);
  }

  async deactivateAccount(
    userId: string,
    _dto: DeactivateAccountDto,
  ): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('El perfil no existe.');

    user.status = UserStatus.DISABLED;
    user.deactivatedAt = new Date();
    await user.save();
    await this.sessionsService.revokeAllForUser(userId);
  }

  private async toResponse(user: UserDocument): Promise<ProfileResponseDto> {
    const avatar = user.avatarObjectKey
      ? await this.storageService.getSignedUrl(user.avatarObjectKey)
      : null;
    const cover = user.coverObjectKey
      ? await this.storageService.getSignedUrl(user.coverObjectKey)
      : null;
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      alias: user.alias ?? null,
      bio: user.bio ?? null,
      city: user.city ?? null,
      country: user.country ?? null,
      racingNumber: user.racingNumber ?? null,
      favoriteCategories: user.favoriteCategories ?? [],
      avatarUrl: avatar?.url ?? null,
      coverUrl: cover?.url ?? null,
    };
  }

  private async signResource(key: string): Promise<PrivateResourceResponseDto> {
    const signed = await this.storageService.getSignedUrl(key);
    return { url: signed.url, expiresAt: signed.expiresAt.toISOString() };
  }

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}

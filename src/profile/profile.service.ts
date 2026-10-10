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
import { User, UserDocument } from '../users/schemas/user.schema';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly sessionsService: SessionsService,
    private readonly configService: ConfigService,
  ) {}

  async get(userId: string): Promise<ProfileResponseDto> {
    const user = await this.userModel.findById(userId).exec();
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

  private toResponse(user: UserDocument): ProfileResponseDto {
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
      favoriteDriver: user.favoriteDriver ?? null,
      favoriteTrack: user.favoriteTrack ?? null,
      avatarUrl: user.avatarUrl ?? null,
      coverUrl: user.coverUrl ?? null,
    };
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

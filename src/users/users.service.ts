import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { compare, hash } from 'bcryptjs';
import { randomInt } from 'crypto';
import { Model } from 'mongoose';
import { EmailService } from '../email/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import {
  User,
  UserDocument,
  UserRole,
  UserStatus,
} from './schemas/user.schema';

@Injectable()
export class UsersService {
  private readonly verificationResendCooldownMs = 60_000;

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.userModel
      .findOne({
        $or: [{ email: createUserDto.email }, { phone: createUserDto.phone }],
      })
      .select('+emailVerificationSentAt')
      .exec();

    if (existingUser) {
      if (
        existingUser.email === createUserDto.email &&
        existingUser.status === UserStatus.PENDING_VERIFICATION
      ) {
        if (this.canSendVerification(existingUser.emailVerificationSentAt)) {
          await this.refreshAndSendVerification(existingUser);
        }

        return this.toResponse(existingUser);
      }

      throw new ConflictException('El correo o teléfono ya está registrado.');
    }

    const saltRounds = Number(
      this.configService.get<string>('BCRYPT_SALT_ROUNDS', '12'),
    );
    const passwordHash = await hash(createUserDto.password, saltRounds);
    const verification = await this.createVerificationCode();

    try {
      const user = await this.userModel.create({
        name: createUserDto.name,
        email: createUserDto.email,
        phone: createUserDto.phone,
        passwordHash,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerificationCodeHash: verification.hash,
        emailVerificationExpiresAt: verification.expiresAt,
        emailVerificationAttempts: 0,
        emailVerificationSentAt: new Date(),
      });

      await this.emailService.sendAccountVerification({
        to: user.email,
        userName: user.name,
        code: verification.code,
        expiresInMinutes: this.getVerificationTtlMinutes(),
      });

      return this.toResponse(user);
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('El correo o teléfono ya está registrado.');
      }

      throw error;
    }
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<UserResponseDto> {
    const user = await this.userModel
      .findOne({
        email: dto.email,
        status: UserStatus.PENDING_VERIFICATION,
      })
      .select(
        '+emailVerificationCodeHash +emailVerificationExpiresAt +emailVerificationAttempts +emailVerificationSentAt',
      )
      .exec();

    if (!user?.emailVerificationCodeHash) {
      throw new BadRequestException('El código de verificación no es válido.');
    }

    if (
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        'El código venció. Solicita uno nuevo para continuar.',
      );
    }

    if (user.emailVerificationAttempts >= 5) {
      throw new BadRequestException(
        'Superaste el número de intentos. Solicita un código nuevo.',
      );
    }

    const isValid = await compare(dto.code, user.emailVerificationCodeHash);
    if (!isValid) {
      user.emailVerificationAttempts += 1;
      await user.save();
      throw new BadRequestException('El código de verificación no es válido.');
    }

    user.status = UserStatus.ACTIVE;
    user.emailVerifiedAt = new Date();
    user.emailVerificationCodeHash = null;
    user.emailVerificationExpiresAt = null;
    user.emailVerificationAttempts = 0;
    await user.save();

    return this.toResponse(user);
  }

  async resendEmailVerification(email: string): Promise<void> {
    const user = await this.userModel
      .findOne({
        email: email.trim().toLowerCase(),
        status: UserStatus.PENDING_VERIFICATION,
      })
      .select(
        '+emailVerificationCodeHash +emailVerificationExpiresAt +emailVerificationAttempts',
      )
      .exec();

    // La respuesta es indistinguible para no revelar qué correos están registrados.
    if (!user) {
      return;
    }

    if (!this.canSendVerification(user.emailVerificationSentAt)) {
      throw new HttpException(
        'Espera un minuto antes de solicitar otro código.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.refreshAndSendVerification(user);
  }

  findByEmailForAuthentication(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.trim().toLowerCase() })
      .select('+passwordHash')
      .exec();
  }

  findByIdForAuthentication(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId).exec();
  }

  private async createVerificationCode() {
    const code = randomInt(100_000, 1_000_000).toString();
    const saltRounds = Number(
      this.configService.get<string>('BCRYPT_SALT_ROUNDS', '12'),
    );
    const expiresAt = new Date(
      Date.now() + this.getVerificationTtlMinutes() * 60_000,
    );

    return { code, hash: await hash(code, saltRounds), expiresAt };
  }

  private canSendVerification(sentAt: Date | null | undefined): boolean {
    return (
      !sentAt ||
      Date.now() - sentAt.getTime() >= this.verificationResendCooldownMs
    );
  }

  private async refreshAndSendVerification(user: UserDocument): Promise<void> {
    const verification = await this.createVerificationCode();
    user.emailVerificationCodeHash = verification.hash;
    user.emailVerificationExpiresAt = verification.expiresAt;
    user.emailVerificationAttempts = 0;
    user.emailVerificationSentAt = new Date();
    await user.save();

    await this.emailService.sendAccountVerification({
      to: user.email,
      userName: user.name,
      code: verification.code,
      expiresInMinutes: this.getVerificationTtlMinutes(),
    });
  }

  private getVerificationTtlMinutes(): number {
    return Number(
      this.configService.get<string>('EMAIL_VERIFICATION_TTL_MINUTES', '10'),
    );
  }

  private toResponse(user: UserDocument): UserResponseDto {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      role: user.role ?? UserRole.READER,
      createdAt: user.createdAt,
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

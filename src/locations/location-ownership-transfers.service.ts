import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { EmailService } from '../email/email.service';
import { User, UserDocument, UserStatus } from '../users/schemas/user.schema';
import { CreateLocationOwnershipTransferDto } from './dto/create-location-ownership-transfer.dto';
import {
  AcceptLocationOwnershipTransferResponseDto,
  LocationOwnershipTransferPreviewDto,
  LocationOwnershipTransferResponseDto,
} from './dto/location-ownership-transfer.dto';
import {
  LocationOwnershipTransfer,
  LocationOwnershipTransferDocument,
  LocationOwnershipTransferStatus,
} from './schemas/location-ownership-transfer.schema';
import {
  Location,
  LocationDocument,
  LocationStatus,
} from './schemas/location.schema';

@Injectable()
export class LocationOwnershipTransfersService {
  constructor(
    @InjectModel(Location.name)
    private readonly locationModel: Model<LocationDocument>,
    @InjectModel(LocationOwnershipTransfer.name)
    private readonly transferModel: Model<LocationOwnershipTransferDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async invite(
    ownerId: string,
    slug: string,
    dto: CreateLocationOwnershipTransferDto,
  ): Promise<LocationOwnershipTransferResponseDto> {
    const location = await this.findOwnedLocation(ownerId, slug);
    await this.expirePendingTransfers(location._id);
    const [currentOwner, newOwner, pending] = await Promise.all([
      this.userModel.findById(ownerId).exec(),
      this.userModel
        .findOne({ email: dto.email, status: UserStatus.ACTIVE })
        .exec(),
      this.transferModel
        .findOne({
          locationId: location._id,
          status: LocationOwnershipTransferStatus.PENDING,
        })
        .exec(),
    ]);
    if (!currentOwner) throw new NotFoundException('El usuario no existe.');
    if (!newOwner)
      throw new NotFoundException(
        'El nuevo propietario debe tener una cuenta activa en ARPA.',
      );
    if (newOwner._id.equals(ownerId))
      throw new ConflictException('Ya eres propietario de esta ubicación.');
    if (pending)
      throw new ConflictException(
        'Ya existe una transferencia pendiente para esta ubicación.',
      );

    const token = randomBytes(32).toString('base64url');
    const ttlDays = Number(
      this.configService.get<string>(
        'LOCATION_OWNERSHIP_TRANSFER_TTL_DAYS',
        '7',
      ),
    );
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const transfer = await this.transferModel.create({
      locationId: location._id,
      fromUserId: new Types.ObjectId(ownerId),
      toUserId: newOwner._id,
      email: newOwner.email,
      tokenHash: this.hashToken(token),
      expiresAt,
    });

    try {
      transfer.resendEmailId =
        await this.emailService.sendLocationOwnershipTransfer({
          to: newOwner.email,
          newOwnerName: newOwner.name,
          currentOwnerName: currentOwner.name,
          locationName: location.name,
          transferUrl: `${this.frontendUrl}/location-ownership-transfers/${token}`,
          expiresAt,
        });
      await transfer.save();
    } catch (error) {
      transfer.status = LocationOwnershipTransferStatus.FAILED;
      await transfer.save();
      throw error;
    }
    return this.toResponse(transfer, location);
  }

  async preview(token: string): Promise<LocationOwnershipTransferPreviewDto> {
    const transfer = await this.findTransfer(token);
    await this.expireIfNeeded(transfer);
    const [location, newOwner] = await Promise.all([
      this.locationModel.findById(transfer.locationId).exec(),
      this.userModel.findById(transfer.toUserId).exec(),
    ]);
    if (!location || location.status !== LocationStatus.ACTIVE || !newOwner) {
      throw new NotFoundException('La transferencia no está disponible.');
    }
    return {
      locationName: location.name,
      locationSlug: location.slug,
      email: transfer.email,
      newOwnerName: newOwner.name,
      status: transfer.status,
      expiresAt: transfer.expiresAt,
    };
  }

  async accept(
    token: string,
    userId: string,
    userEmail: string,
  ): Promise<AcceptLocationOwnershipTransferResponseDto> {
    const transfer = await this.findTransfer(token);
    await this.expireIfNeeded(transfer);
    if (transfer.status === LocationOwnershipTransferStatus.EXPIRED)
      throw new GoneException('La transferencia expiró.');
    if (transfer.status !== LocationOwnershipTransferStatus.PENDING)
      throw new BadRequestException('La transferencia ya no está disponible.');
    if (
      transfer.email !== userEmail.trim().toLowerCase() ||
      !transfer.toUserId.equals(userId)
    ) {
      throw new ForbiddenException(
        'Inicia sesión con el correo que recibió la transferencia.',
      );
    }

    const location = await this.locationModel
      .findById(transfer.locationId)
      .exec();
    if (!location || location.status !== LocationStatus.ACTIVE)
      throw new NotFoundException('La ubicación no existe.');
    const result = await this.locationModel
      .updateOne(
        {
          _id: location._id,
          ownerId: transfer.fromUserId,
          status: LocationStatus.ACTIVE,
        },
        { $set: { ownerId: transfer.toUserId } },
      )
      .exec();
    if (result.modifiedCount !== 1) {
      transfer.status = LocationOwnershipTransferStatus.CANCELLED;
      await transfer.save();
      throw new ConflictException('La propiedad de la ubicación ya cambió.');
    }
    transfer.status = LocationOwnershipTransferStatus.ACCEPTED;
    transfer.acceptedAt = new Date();
    await transfer.save();
    return { locationSlug: location.slug, locationName: location.name };
  }

  private findOwnedLocation(ownerId: string, slug: string) {
    return this.locationModel
      .findOne({
        slug: slug.trim().toLowerCase(),
        ownerId: new Types.ObjectId(ownerId),
        status: LocationStatus.ACTIVE,
      })
      .exec()
      .then((location) => {
        if (!location) throw new NotFoundException('La ubicación no existe.');
        return location;
      });
  }

  private findTransfer(
    token: string,
  ): Promise<LocationOwnershipTransferDocument> {
    return this.transferModel
      .findOne({ tokenHash: this.hashToken(token) })
      .exec()
      .then((transfer) => {
        if (!transfer)
          throw new NotFoundException('La transferencia no existe.');
        return transfer;
      });
  }

  private async expirePendingTransfers(locationId: Types.ObjectId) {
    await this.transferModel
      .updateMany(
        {
          locationId,
          status: LocationOwnershipTransferStatus.PENDING,
          expiresAt: { $lte: new Date() },
        },
        { $set: { status: LocationOwnershipTransferStatus.EXPIRED } },
      )
      .exec();
  }

  private async expireIfNeeded(transfer: LocationOwnershipTransferDocument) {
    if (
      transfer.status === LocationOwnershipTransferStatus.PENDING &&
      transfer.expiresAt.getTime() <= Date.now()
    ) {
      transfer.status = LocationOwnershipTransferStatus.EXPIRED;
      await transfer.save();
    }
  }

  private toResponse(
    transfer: LocationOwnershipTransferDocument,
    location: LocationDocument,
  ): LocationOwnershipTransferResponseDto {
    return {
      id: transfer._id.toString(),
      locationName: location.name,
      email: transfer.email,
      status: transfer.status,
      expiresAt: transfer.expiresAt,
    };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
  private get frontendUrl() {
    return this.configService
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .replace(/\/$/, '');
  }
}

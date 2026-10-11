import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { ArchiveLocationDto } from './dto/archive-location.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { LocationResponseDto } from './dto/location-response.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
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
export class LocationsService {
  constructor(
    @InjectModel(Location.name)
    private readonly locationModel: Model<LocationDocument>,
    @InjectModel(LocationOwnershipTransfer.name)
    private readonly transferModel: Model<LocationOwnershipTransferDocument>,
  ) {}

  async create(
    userId: string,
    dto: CreateLocationDto,
  ): Promise<LocationResponseDto> {
    const slug = await this.availableSlug(dto.name);
    try {
      const location = await this.locationModel.create({
        ...dto,
        slug,
        ownerId: new Types.ObjectId(userId),
      });
      return this.present(location, userId);
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'No pudimos generar un identificador único para la ubicación.',
        );
      }
      throw error;
    }
  }

  async listMine(userId: string): Promise<LocationResponseDto[]> {
    const locations = await this.locationModel
      .find({
        ownerId: new Types.ObjectId(userId),
        status: LocationStatus.ACTIVE,
      })
      .sort({ createdAt: -1 })
      .exec();
    return locations.map((location) => this.present(location, userId));
  }

  async getBySlug(userId: string, slug: string): Promise<LocationResponseDto> {
    const location = await this.findActive(slug);
    if (!location.ownerId.equals(userId)) {
      throw new NotFoundException('La ubicación no existe.');
    }
    return this.present(location, userId);
  }

  async update(
    userId: string,
    slug: string,
    dto: UpdateLocationDto,
  ): Promise<LocationResponseDto> {
    const location = await this.findOwned(userId, slug);
    Object.assign(location, dto);
    await location.save();
    return this.present(location, userId);
  }

  async archive(
    userId: string,
    slug: string,
    dto: ArchiveLocationDto,
  ): Promise<void> {
    const location = await this.findOwned(userId, slug);
    if (dto.confirmationName !== location.name) {
      throw new ConflictException(
        'El nombre de confirmación no coincide con la ubicación.',
      );
    }

    location.status = LocationStatus.ARCHIVED;
    location.archivedAt = new Date();
    location.archivedByUserId = new Types.ObjectId(userId);
    await location.save();
    await this.transferModel
      .updateMany(
        {
          locationId: location._id,
          status: LocationOwnershipTransferStatus.PENDING,
        },
        { $set: { status: LocationOwnershipTransferStatus.CANCELLED } },
      )
      .exec();
  }

  private findActive(slug: string): Promise<LocationDocument> {
    return this.locationModel
      .findOne({
        slug: slug.trim().toLowerCase(),
        status: LocationStatus.ACTIVE,
      })
      .exec()
      .then((location) => {
        if (!location) throw new NotFoundException('La ubicación no existe.');
        return location;
      });
  }

  private findOwned(userId: string, slug: string): Promise<LocationDocument> {
    return this.locationModel
      .findOne({
        slug: slug.trim().toLowerCase(),
        ownerId: new Types.ObjectId(userId),
        status: LocationStatus.ACTIVE,
      })
      .exec()
      .then((location) => {
        if (!location) throw new NotFoundException('La ubicación no existe.');
        return location;
      });
  }

  private present(
    location: LocationDocument,
    userId: string,
  ): LocationResponseDto {
    return {
      id: location._id.toString(),
      slug: location.slug,
      name: location.name,
      business: location.business,
      discipline: location.discipline,
      address: location.address,
      city: location.city,
      description: location.description,
      coverImageUrl: location.coverImageUrl ?? null,
      circuitMapImageUrl: location.circuitMapImageUrl ?? null,
      photoUrls: location.photoUrls ?? [],
      ownerId: location.ownerId.toString(),
      status: location.status,
      canEdit: location.ownerId.equals(userId),
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    };
  }

  private async availableSlug(name: string): Promise<string> {
    const base =
      name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'ubicacion';
    let slug = base;
    while (await this.locationModel.exists({ slug })) {
      slug = `${base}-${randomBytes(3).toString('hex')}`;
    }
    return slug;
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}

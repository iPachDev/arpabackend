import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { StorageService } from '../storage/storage.service';
import { ArchiveTeamDto } from './dto/archive-team.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamImageKind } from './dto/team-image-kind.dto';
import { TeamResponseDto } from './dto/team-response.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import {
  TeamInvitation,
  TeamInvitationDocument,
  TeamInvitationStatus,
} from './schemas/team-invitation.schema';
import {
  Team,
  TeamDocument,
  TeamMemberRole,
  TeamPrivacy,
  TeamStatus,
} from './schemas/team.schema';

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team.name)
    private readonly teamModel: Model<TeamDocument>,
    @InjectModel(TeamInvitation.name)
    private readonly invitationModel: Model<TeamInvitationDocument>,
    private readonly storageService: StorageService,
  ) {}

  async create(
    ownerId: string,
    createTeamDto: CreateTeamDto,
  ): Promise<TeamResponseDto> {
    const slug = await this.availableSlug(createTeamDto.name);

    try {
      const team = await this.teamModel.create({
        ...createTeamDto,
        allowNonMembers: createTeamDto.privacy === TeamPrivacy.PUBLIC,
        showMembers: false,
        slug,
        ownerId: new Types.ObjectId(ownerId),
      });
      return this.toResponse(team, ownerId);
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'No pudimos generar un identificador único para el equipo.',
        );
      }
      throw error;
    }
  }

  async listMine(ownerId: string): Promise<TeamResponseDto[]> {
    const userObjectId = new Types.ObjectId(ownerId);
    const teams = await this.teamModel
      .find({
        status: TeamStatus.ACTIVE,
        $or: [{ ownerId: userObjectId }, { 'members.userId': userObjectId }],
      })
      .select('+photoObjectKeys +logoObjectKey +coverObjectKey')
      .sort({ createdAt: -1 })
      .exec();

    return Promise.all(teams.map((team) => this.toResponse(team, ownerId)));
  }

  async getBySlug(userId: string, slug: string): Promise<TeamResponseDto> {
    const team = await this.teamModel
      .findOne({
        slug: slug.trim().toLowerCase(),
        status: TeamStatus.ACTIVE,
      })
      .select('+photoObjectKeys +logoObjectKey +coverObjectKey')
      .exec();

    if (!team) throw new NotFoundException('El equipo no existe.');
    return this.toResponse(team, userId);
  }

  async update(
    ownerId: string,
    slug: string,
    dto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    const team = await this.findOwnedActiveTeam(ownerId, slug);
    Object.assign(
      team,
      Object.fromEntries(
        Object.entries(dto).filter(
          ([, value]) => value !== undefined && value !== null,
        ),
      ),
    );
    if (dto.allowNonMembers !== undefined) {
      team.privacy = dto.allowNonMembers
        ? TeamPrivacy.PUBLIC
        : TeamPrivacy.PRIVATE;
    } else if (dto.privacy !== undefined) {
      team.allowNonMembers = dto.privacy === TeamPrivacy.PUBLIC;
    }
    await team.save();
    return this.toResponse(team, ownerId);
  }

  async uploadPhotos(
    ownerId: string,
    slug: string,
    files: Express.Multer.File[],
  ): Promise<TeamResponseDto> {
    if (files.length === 0) {
      throw new BadRequestException('Selecciona al menos una imagen.');
    }

    const team = await this.findOwnedActiveTeam(ownerId, slug);
    const currentKeys = team.photoObjectKeys ?? [];
    if (currentKeys.length + files.length > 6) {
      throw new BadRequestException('El equipo puede tener hasta seis fotos.');
    }

    const uploadedKeys: string[] = [];
    try {
      for (const file of files) {
        uploadedKeys.push(
          await this.storageService.uploadPrivate({
            buffer: file.buffer,
            contentType: file.mimetype,
            directory: `teams/${team._id.toString()}/photos`,
          }),
        );
      }
      team.photoObjectKeys = [...currentKeys, ...uploadedKeys];
      await team.save();
    } catch (error) {
      await Promise.all(
        uploadedKeys.map((key) =>
          this.storageService.delete(key).catch(() => undefined),
        ),
      );
      throw error;
    }

    return this.toResponse(team, ownerId);
  }

  async uploadImage(
    ownerId: string,
    slug: string,
    kind: TeamImageKind,
    file: Express.Multer.File,
  ): Promise<TeamResponseDto> {
    const team = await this.findOwnedActiveTeam(ownerId, slug);
    const field =
      kind === TeamImageKind.LOGO ? 'logoObjectKey' : 'coverObjectKey';
    const previousKey = team[field];
    const key = await this.storageService.uploadPrivate({
      buffer: file.buffer,
      contentType: file.mimetype,
      directory: `teams/${team._id.toString()}/${kind}`,
    });

    try {
      team[field] = key;
      await team.save();
    } catch (error) {
      await this.storageService.delete(key).catch(() => undefined);
      throw error;
    }
    if (previousKey) {
      await this.storageService.delete(previousKey).catch(() => undefined);
    }
    return this.toResponse(team, ownerId);
  }

  async archive(
    ownerId: string,
    slug: string,
    dto: ArchiveTeamDto,
  ): Promise<void> {
    const team = await this.findOwnedActiveTeam(ownerId, slug);
    if (dto.confirmationName !== team.name) {
      throw new ConflictException(
        'El nombre de confirmación no coincide con el equipo.',
      );
    }

    team.status = TeamStatus.ARCHIVED;
    team.archivedAt = new Date();
    team.archivedByUserId = new Types.ObjectId(ownerId);
    await team.save();

    await this.invitationModel
      .updateMany(
        {
          teamId: team._id,
          status: TeamInvitationStatus.PENDING,
        },
        { $set: { status: TeamInvitationStatus.CANCELLED } },
      )
      .exec();
  }

  private async findOwnedActiveTeam(
    ownerId: string,
    slug: string,
  ): Promise<TeamDocument> {
    const team = await this.teamModel
      .findOne({
        slug: slug.trim().toLowerCase(),
        ownerId: new Types.ObjectId(ownerId),
        status: TeamStatus.ACTIVE,
      })
      .select('+photoObjectKeys +logoObjectKey +coverObjectKey')
      .exec();
    if (!team) throw new NotFoundException('El equipo no existe.');
    return team;
  }

  private async availableSlug(name: string): Promise<string> {
    const baseSlug =
      name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80) || 'equipo';
    const exists = await this.teamModel.exists({ slug: baseSlug }).exec();
    return exists ? `${baseSlug}-${randomBytes(3).toString('hex')}` : baseSlug;
  }

  private async toResponse(
    team: TeamDocument,
    userId: string,
  ): Promise<TeamResponseDto> {
    const membershipRole: TeamMemberRole | null = team.ownerId.equals(userId)
      ? TeamMemberRole.OWNER
      : ((team.members ?? []).find((member) => member.userId.equals(userId))
          ?.role ?? null);
    const allowNonMembers =
      team.allowNonMembers ?? team.privacy === TeamPrivacy.PUBLIC;
    const showMembers = team.showMembers ?? false;
    const isPrivateView = !allowNonMembers && membershipRole === null;
    const photoUrls = isPrivateView
      ? []
      : await Promise.all(
          (team.photoObjectKeys ?? []).map(
            async (key) => (await this.storageService.getSignedUrl(key)).url,
          ),
        );
    const [logoImageUrl, coverImageUrl] = await Promise.all([
      team.logoObjectKey
        ? this.storageService
            .getSignedUrl(team.logoObjectKey)
            .then((resource) => resource.url)
        : null,
      team.coverObjectKey
        ? this.storageService
            .getSignedUrl(team.coverObjectKey)
            .then((resource) => resource.url)
        : null,
    ]);
    return {
      id: team._id.toString(),
      slug: team.slug,
      name: team.name,
      discipline: team.discipline,
      privacy: allowNonMembers ? TeamPrivacy.PUBLIC : TeamPrivacy.PRIVATE,
      allowNonMembers,
      showMembers,
      location: isPrivateView ? null : team.location,
      description: isPrivateView ? null : team.description,
      logoImageUrl,
      coverImageUrl,
      photoUrls,
      status: team.status ?? TeamStatus.ACTIVE,
      membershipRole,
      memberCount: isPrivateView ? null : 1 + (team.members?.length ?? 0),
      isPrivateView,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
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

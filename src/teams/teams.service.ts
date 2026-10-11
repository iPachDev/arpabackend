import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { ArchiveTeamDto } from './dto/archive-team.dto';
import { CreateTeamDto } from './dto/create-team.dto';
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
  TeamStatus,
} from './schemas/team.schema';

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team.name)
    private readonly teamModel: Model<TeamDocument>,
    @InjectModel(TeamInvitation.name)
    private readonly invitationModel: Model<TeamInvitationDocument>,
  ) {}

  async create(
    ownerId: string,
    createTeamDto: CreateTeamDto,
  ): Promise<TeamResponseDto> {
    const slug = await this.availableSlug(createTeamDto.name);

    try {
      const team = await this.teamModel.create({
        ...createTeamDto,
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
      .sort({ createdAt: -1 })
      .exec();

    return teams.map((team) => this.toResponse(team, ownerId));
  }

  async getMineBySlug(ownerId: string, slug: string): Promise<TeamResponseDto> {
    const userObjectId = new Types.ObjectId(ownerId);
    const team = await this.teamModel
      .findOne({
        slug: slug.trim().toLowerCase(),
        status: TeamStatus.ACTIVE,
        $or: [{ ownerId: userObjectId }, { 'members.userId': userObjectId }],
      })
      .exec();

    if (!team) throw new NotFoundException('El equipo no existe.');
    return this.toResponse(team, ownerId);
  }

  async update(
    ownerId: string,
    slug: string,
    dto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    const team = await this.findOwnedActiveTeam(ownerId, slug);
    Object.assign(team, dto);
    await team.save();
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

  private toResponse(team: TeamDocument, userId: string): TeamResponseDto {
    const membershipRole = team.ownerId.equals(userId)
      ? TeamMemberRole.OWNER
      : ((team.members ?? []).find((member) => member.userId.equals(userId))
          ?.role ?? TeamMemberRole.READER);
    return {
      id: team._id.toString(),
      slug: team.slug,
      name: team.name,
      discipline: team.discipline,
      privacy: team.privacy,
      location: team.location,
      description: team.description,
      logoImageUrl: team.logoImageUrl ?? null,
      coverImageUrl: team.coverImageUrl ?? null,
      status: team.status ?? TeamStatus.ACTIVE,
      membershipRole,
      memberCount: 1 + (team.members?.length ?? 0),
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

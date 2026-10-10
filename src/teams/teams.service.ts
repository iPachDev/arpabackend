import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamResponseDto } from './dto/team-response.dto';
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
      return this.toResponse(team);
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
    const teams = await this.teamModel
      .find({
        ownerId: new Types.ObjectId(ownerId),
        status: TeamStatus.ACTIVE,
      })
      .sort({ createdAt: -1 })
      .exec();

    return teams.map((team) => this.toResponse(team));
  }

  async getMineBySlug(
    ownerId: string,
    slug: string,
  ): Promise<TeamResponseDto> {
    const team = await this.teamModel
      .findOne({
        slug: slug.trim().toLowerCase(),
        ownerId: new Types.ObjectId(ownerId),
        status: TeamStatus.ACTIVE,
      })
      .exec();

    if (!team) throw new NotFoundException('El equipo no existe.');
    return this.toResponse(team);
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
    return exists
      ? `${baseSlug}-${randomBytes(3).toString('hex')}`
      : baseSlug;
  }

  private toResponse(team: TeamDocument): TeamResponseDto {
    return {
      id: team._id.toString(),
      slug: team.slug,
      name: team.name,
      discipline: team.discipline,
      privacy: team.privacy,
      location: team.location,
      description: team.description,
      status: team.status ?? TeamStatus.ACTIVE,
      membershipRole: TeamMemberRole.OWNER,
      memberCount: 1,
      createdAt: team.createdAt,
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


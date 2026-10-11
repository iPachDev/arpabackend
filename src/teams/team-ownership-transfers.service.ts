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
import { CreateTeamOwnershipTransferDto } from './dto/create-team-ownership-transfer.dto';
import {
  AcceptTeamOwnershipTransferResponseDto,
  TeamOwnershipTransferPreviewDto,
  TeamOwnershipTransferResponseDto,
} from './dto/team-ownership-transfer.dto';
import {
  TeamOwnershipTransfer,
  TeamOwnershipTransferDocument,
  TeamOwnershipTransferStatus,
} from './schemas/team-ownership-transfer.schema';
import { Team, TeamDocument, TeamStatus } from './schemas/team.schema';

@Injectable()
export class TeamOwnershipTransfersService {
  constructor(
    @InjectModel(Team.name)
    private readonly teamModel: Model<TeamDocument>,
    @InjectModel(TeamOwnershipTransfer.name)
    private readonly transferModel: Model<TeamOwnershipTransferDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async invite(
    ownerId: string,
    slug: string,
    dto: CreateTeamOwnershipTransferDto,
  ): Promise<TeamOwnershipTransferResponseDto> {
    const team = await this.findOwnedTeam(ownerId, slug);
    await this.expirePendingTransfers(team._id);

    const [currentOwner, newOwner, pending] = await Promise.all([
      this.userModel.findById(ownerId).exec(),
      this.userModel
        .findOne({ email: dto.email, status: UserStatus.ACTIVE })
        .exec(),
      this.transferModel
        .findOne({
          teamId: team._id,
          status: TeamOwnershipTransferStatus.PENDING,
        })
        .exec(),
    ]);
    if (!currentOwner) throw new NotFoundException('El usuario no existe.');
    if (!newOwner) {
      throw new NotFoundException(
        'El nuevo propietario debe tener una cuenta activa en ARPA.',
      );
    }
    if (newOwner._id.equals(ownerId)) {
      throw new ConflictException('Ya eres propietario de este equipo.');
    }
    if (pending) {
      throw new ConflictException(
        'Ya existe una transferencia pendiente para este equipo.',
      );
    }

    const token = randomBytes(32).toString('base64url');
    const ttlDays = Number(
      this.configService.get<string>('TEAM_OWNERSHIP_TRANSFER_TTL_DAYS', '7'),
    );
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const transfer = await this.transferModel.create({
      teamId: team._id,
      fromUserId: new Types.ObjectId(ownerId),
      toUserId: newOwner._id,
      email: newOwner.email,
      tokenHash: this.hashToken(token),
      expiresAt,
    });

    try {
      transfer.resendEmailId =
        await this.emailService.sendTeamOwnershipTransfer({
          to: newOwner.email,
          newOwnerName: newOwner.name,
          currentOwnerName: currentOwner.name,
          teamName: team.name,
          transferUrl: `${this.frontendUrl}/team-ownership-transfers/${token}`,
          expiresAt,
        });
      await transfer.save();
    } catch (error) {
      transfer.status = TeamOwnershipTransferStatus.FAILED;
      await transfer.save();
      throw error;
    }

    return this.toResponse(transfer, team);
  }

  async preview(token: string): Promise<TeamOwnershipTransferPreviewDto> {
    const transfer = await this.findTransfer(token);
    await this.expireIfNeeded(transfer);
    const [team, newOwner] = await Promise.all([
      this.teamModel.findById(transfer.teamId).exec(),
      this.userModel.findById(transfer.toUserId).exec(),
    ]);
    if (!team || team.status !== TeamStatus.ACTIVE || !newOwner) {
      throw new NotFoundException('La transferencia no está disponible.');
    }

    return {
      teamName: team.name,
      teamSlug: team.slug,
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
  ): Promise<AcceptTeamOwnershipTransferResponseDto> {
    const transfer = await this.findTransfer(token);
    await this.expireIfNeeded(transfer);
    if (transfer.status === TeamOwnershipTransferStatus.EXPIRED) {
      throw new GoneException('La transferencia expiró.');
    }
    if (transfer.status !== TeamOwnershipTransferStatus.PENDING) {
      throw new BadRequestException('La transferencia ya no está disponible.');
    }
    if (
      transfer.email !== userEmail.trim().toLowerCase() ||
      !transfer.toUserId.equals(userId)
    ) {
      throw new ForbiddenException(
        'Inicia sesión con el correo que recibió la transferencia.',
      );
    }

    const team = await this.teamModel.findById(transfer.teamId).exec();
    if (!team || team.status !== TeamStatus.ACTIVE) {
      throw new NotFoundException('El equipo no existe.');
    }
    const result = await this.teamModel
      .updateOne(
        {
          _id: team._id,
          ownerId: transfer.fromUserId,
          status: TeamStatus.ACTIVE,
        },
        {
          $set: { ownerId: transfer.toUserId },
          $pull: { members: { userId: transfer.toUserId } },
        },
      )
      .exec();
    if (result.modifiedCount !== 1) {
      transfer.status = TeamOwnershipTransferStatus.CANCELLED;
      await transfer.save();
      throw new ConflictException('La propiedad del equipo ya cambió.');
    }

    transfer.status = TeamOwnershipTransferStatus.ACCEPTED;
    transfer.acceptedAt = new Date();
    await transfer.save();
    return { teamSlug: team.slug, teamName: team.name };
  }

  private findOwnedTeam(ownerId: string, slug: string) {
    return this.teamModel
      .findOne({
        slug: slug.trim().toLowerCase(),
        ownerId: new Types.ObjectId(ownerId),
        status: TeamStatus.ACTIVE,
      })
      .exec()
      .then((team) => {
        if (!team) throw new NotFoundException('El equipo no existe.');
        return team;
      });
  }

  private findTransfer(token: string): Promise<TeamOwnershipTransferDocument> {
    return this.transferModel
      .findOne({ tokenHash: this.hashToken(token) })
      .exec()
      .then((transfer) => {
        if (!transfer) {
          throw new NotFoundException('La transferencia no existe.');
        }
        return transfer;
      });
  }

  private async expirePendingTransfers(teamId: Types.ObjectId) {
    await this.transferModel
      .updateMany(
        {
          teamId,
          status: TeamOwnershipTransferStatus.PENDING,
          expiresAt: { $lte: new Date() },
        },
        { $set: { status: TeamOwnershipTransferStatus.EXPIRED } },
      )
      .exec();
  }

  private async expireIfNeeded(transfer: TeamOwnershipTransferDocument) {
    if (
      transfer.status === TeamOwnershipTransferStatus.PENDING &&
      transfer.expiresAt.getTime() <= Date.now()
    ) {
      transfer.status = TeamOwnershipTransferStatus.EXPIRED;
      await transfer.save();
    }
  }

  private toResponse(
    transfer: TeamOwnershipTransferDocument,
    team: TeamDocument,
  ): TeamOwnershipTransferResponseDto {
    return {
      id: transfer._id.toString(),
      teamName: team.name,
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

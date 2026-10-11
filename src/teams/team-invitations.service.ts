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
import { User, UserDocument } from '../users/schemas/user.schema';
import { AcceptTeamInvitationResponseDto } from './dto/accept-team-invitation-response.dto';
import { CreateTeamInvitationDto } from './dto/create-team-invitation.dto';
import { TeamInvitationPreviewDto } from './dto/team-invitation-preview.dto';
import {
  TeamRosterEntryDto,
  TeamRosterStatus,
} from './dto/team-roster-entry.dto';
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
export class TeamInvitationsService {
  constructor(
    @InjectModel(Team.name)
    private readonly teamModel: Model<TeamDocument>,
    @InjectModel(TeamInvitation.name)
    private readonly invitationModel: Model<TeamInvitationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async invite(
    ownerId: string,
    slug: string,
    dto: CreateTeamInvitationDto,
  ): Promise<TeamRosterEntryDto> {
    const team = await this.findOwnedTeam(ownerId, slug);
    await this.expirePendingInvitations(team._id);

    const [inviter, existingUser, pendingInvitation] = await Promise.all([
      this.userModel.findById(ownerId).exec(),
      this.userModel.findOne({ email: dto.email }).exec(),
      this.invitationModel
        .findOne({
          teamId: team._id,
          email: dto.email,
          status: TeamInvitationStatus.PENDING,
        })
        .exec(),
    ]);

    if (!inviter) throw new NotFoundException('El usuario no existe.');
    if (pendingInvitation) {
      throw new ConflictException('Ya existe una invitación pendiente.');
    }
    if (
      existingUser &&
      (team.ownerId.equals(existingUser._id) ||
        (team.members ?? []).some((member) =>
          member.userId.equals(existingUser._id),
        ))
    ) {
      throw new ConflictException('El usuario ya pertenece al equipo.');
    }

    const token = randomBytes(32).toString('base64url');
    const ttlDays = Number(
      this.configService.get<string>('TEAM_INVITATION_TTL_DAYS', '7'),
    );
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const invitation = await this.invitationModel.create({
      teamId: team._id,
      email: dto.email,
      invitedName: dto.invitedName,
      sportsRole: dto.sportsRole,
      memberRole: dto.memberRole,
      invitedByUserId: new Types.ObjectId(ownerId),
      tokenHash: this.hashToken(token),
      expiresAt,
    });

    try {
      invitation.resendEmailId = await this.emailService.sendTeamInvitation({
        to: dto.email,
        invitedName: dto.invitedName,
        teamName: team.name,
        inviterName: inviter.name,
        invitationUrl: `${this.frontendUrl}/invitations/${token}`,
        expiresAt,
      });
      await invitation.save();
    } catch (error) {
      invitation.status = TeamInvitationStatus.FAILED;
      await invitation.save();
      throw error;
    }

    return this.invitationToRoster(invitation);
  }

  async listRoster(
    userId: string,
    slug: string,
  ): Promise<TeamRosterEntryDto[]> {
    const team = await this.findAccessibleTeam(userId, slug);
    await this.expirePendingInvitations(team._id);

    const memberIds = (team.members ?? []).map((member) => member.userId);
    const [owner, memberUsers, invitations] = await Promise.all([
      this.userModel.findById(team.ownerId).exec(),
      this.userModel.find({ _id: { $in: memberIds } }).exec(),
      this.invitationModel
        .find({ teamId: team._id })
        .sort({ createdAt: -1 })
        .exec(),
    ]);

    const entries: TeamRosterEntryDto[] = [];
    if (owner) {
      entries.push({
        id: owner._id.toString(),
        name: owner.name,
        email: owner.email,
        sportsRole: 'Owner',
        membershipRole: TeamMemberRole.OWNER,
        status: TeamRosterStatus.OWNER,
        invitedAt: null,
        joinedAt: team.createdAt,
        isCurrentUser: owner._id.equals(userId),
      });
    }

    for (const member of team.members ?? []) {
      const user = memberUsers.find((item) => item._id.equals(member.userId));
      if (!user) continue;
      const acceptedInvitation = invitations.find(
        (item) =>
          item.status === TeamInvitationStatus.ACCEPTED &&
          item.acceptedByUserId?.equals(user._id),
      );
      entries.push({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        sportsRole: member.sportsRole,
        membershipRole: member.role,
        status: TeamRosterStatus.ACCEPTED,
        invitedAt: acceptedInvitation?.createdAt ?? null,
        joinedAt: member.joinedAt,
        isCurrentUser: user._id.equals(userId),
      });
    }

    entries.push(
      ...invitations
        .filter((item) => item.status !== TeamInvitationStatus.ACCEPTED)
        .map((item) => this.invitationToRoster(item)),
    );
    return entries;
  }

  async preview(token: string): Promise<TeamInvitationPreviewDto> {
    const invitation = await this.findInvitation(token);
    await this.expireIfNeeded(invitation);
    const team = await this.teamModel.findById(invitation.teamId).exec();
    if (!team || team.status !== TeamStatus.ACTIVE) {
      throw new NotFoundException('El equipo no existe.');
    }
    const existingUser = await this.userModel
      .exists({ email: invitation.email })
      .exec();

    return {
      teamName: team.name,
      teamSlug: team.slug,
      email: invitation.email,
      invitedName: invitation.invitedName,
      sportsRole: invitation.sportsRole,
      membershipRole: invitation.memberRole,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      requiresRegistration: !existingUser,
    };
  }

  async accept(
    token: string,
    userId: string,
    userEmail: string,
  ): Promise<AcceptTeamInvitationResponseDto> {
    const invitation = await this.findInvitation(token);
    await this.expireIfNeeded(invitation);

    if (invitation.status === TeamInvitationStatus.EXPIRED) {
      throw new GoneException('La invitación expiró.');
    }
    if (invitation.status !== TeamInvitationStatus.PENDING) {
      throw new BadRequestException('La invitación ya no está disponible.');
    }
    if (invitation.email !== userEmail.trim().toLowerCase()) {
      throw new ForbiddenException(
        'Inicia sesión con el correo que recibió la invitación.',
      );
    }

    const team = await this.teamModel.findById(invitation.teamId).exec();
    if (!team || team.status !== TeamStatus.ACTIVE) {
      throw new NotFoundException('El equipo no existe.');
    }
    if (team.ownerId.equals(userId)) {
      throw new ConflictException('Ya eres owner de este equipo.');
    }

    const memberUserId = new Types.ObjectId(userId);
    await this.teamModel
      .updateOne(
        {
          _id: team._id,
          'members.userId': { $ne: memberUserId },
        },
        {
          $push: {
            members: {
              userId: memberUserId,
              role: invitation.memberRole,
              sportsRole: invitation.sportsRole,
              joinedAt: new Date(),
            },
          },
        },
      )
      .exec();

    invitation.status = TeamInvitationStatus.ACCEPTED;
    invitation.acceptedByUserId = memberUserId;
    invitation.acceptedAt = new Date();
    await invitation.save();

    return { teamSlug: team.slug, teamName: team.name };
  }

  async removeMember(
    actorId: string,
    slug: string,
    memberId: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(memberId)) {
      throw new BadRequestException('El integrante no es válido.');
    }

    const team = await this.findManageableTeam(actorId, slug);
    const targetId = new Types.ObjectId(memberId);
    if (team.ownerId.equals(targetId)) {
      throw new ForbiddenException('No puedes expulsar al owner del equipo.');
    }
    if (targetId.equals(actorId)) {
      throw new ForbiddenException('No puedes expulsarte a ti mismo.');
    }
    if (
      !(team.members ?? []).some((member) => member.userId.equals(targetId))
    ) {
      throw new NotFoundException('El integrante no pertenece al equipo.');
    }

    await this.teamModel
      .updateOne(
        { _id: team._id, ownerId: { $ne: targetId } },
        { $pull: { members: { userId: targetId } } },
      )
      .exec();
  }

  async cancelInvitation(
    actorId: string,
    slug: string,
    invitationId: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(invitationId)) {
      throw new BadRequestException('La invitación no es válida.');
    }

    const team = await this.findManageableTeam(actorId, slug);
    const invitation = await this.invitationModel
      .findOne({
        _id: new Types.ObjectId(invitationId),
        teamId: team._id,
        status: TeamInvitationStatus.PENDING,
      })
      .exec();
    if (!invitation) {
      throw new NotFoundException('La invitación pendiente no existe.');
    }

    invitation.status = TeamInvitationStatus.CANCELLED;
    await invitation.save();
  }

  private async findOwnedTeam(
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

  private async findAccessibleTeam(
    userId: string,
    slug: string,
  ): Promise<TeamDocument> {
    const objectId = new Types.ObjectId(userId);
    const team = await this.teamModel
      .findOne({
        slug: slug.trim().toLowerCase(),
        status: TeamStatus.ACTIVE,
        $or: [{ ownerId: objectId }, { 'members.userId': objectId }],
      })
      .exec();
    if (!team) throw new NotFoundException('El equipo no existe.');
    return team;
  }

  private async findManageableTeam(
    userId: string,
    slug: string,
  ): Promise<TeamDocument> {
    const objectId = new Types.ObjectId(userId);
    const team = await this.teamModel
      .findOne({
        slug: slug.trim().toLowerCase(),
        status: TeamStatus.ACTIVE,
        $or: [
          { ownerId: objectId },
          {
            members: {
              $elemMatch: {
                userId: objectId,
                role: TeamMemberRole.EDITOR,
              },
            },
          },
        ],
      })
      .exec();
    if (!team) {
      throw new ForbiddenException(
        'Solo owners y editores pueden administrar integrantes.',
      );
    }
    return team;
  }

  private findInvitation(token: string): Promise<TeamInvitationDocument> {
    return this.invitationModel
      .findOne({ tokenHash: this.hashToken(token) })
      .exec()
      .then((invitation) => {
        if (!invitation) {
          throw new NotFoundException('La invitación no existe.');
        }
        return invitation;
      });
  }

  private async expirePendingInvitations(teamId: Types.ObjectId) {
    await this.invitationModel
      .updateMany(
        {
          teamId,
          status: TeamInvitationStatus.PENDING,
          expiresAt: { $lte: new Date() },
        },
        { $set: { status: TeamInvitationStatus.EXPIRED } },
      )
      .exec();
  }

  private async expireIfNeeded(invitation: TeamInvitationDocument) {
    if (
      invitation.status === TeamInvitationStatus.PENDING &&
      invitation.expiresAt.getTime() <= Date.now()
    ) {
      invitation.status = TeamInvitationStatus.EXPIRED;
      await invitation.save();
    }
  }

  private invitationToRoster(
    invitation: TeamInvitationDocument,
  ): TeamRosterEntryDto {
    return {
      id: invitation._id.toString(),
      name: invitation.invitedName,
      email: invitation.email,
      sportsRole: invitation.sportsRole,
      membershipRole: invitation.memberRole,
      status: invitation.status,
      invitedAt: invitation.createdAt,
      joinedAt: invitation.acceptedAt,
      isCurrentUser: false,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private get frontendUrl(): string {
    return this.configService
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .replace(/\/$/, '');
  }
}

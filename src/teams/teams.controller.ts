import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtension,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { UserRole } from '../users/schemas/user.schema';
import { ArchiveTeamDto } from './dto/archive-team.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { CreateTeamInvitationDto } from './dto/create-team-invitation.dto';
import { CreateTeamOwnershipTransferDto } from './dto/create-team-ownership-transfer.dto';
import { TeamOwnershipTransferResponseDto } from './dto/team-ownership-transfer.dto';
import { TeamResponseDto } from './dto/team-response.dto';
import { TeamRosterEntryDto } from './dto/team-roster-entry.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamInvitationsService } from './team-invitations.service';
import { TeamOwnershipTransfersService } from './team-ownership-transfers.service';
import { TeamsService } from './teams.service';

@ApiTags('Teams / Party Reference Data Directory')
@Controller({ path: 'teams', version: '1' })
@Roles(UserRole.OWNER, UserRole.EDITOR, UserRole.READER)
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly invitationsService: TeamInvitationsService,
    private readonly ownershipTransfersService: TeamOwnershipTransfersService,
  ) {}

  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Party Reference Data Directory')
  @ApiExtension('x-bian-action-term', 'Register')
  @ApiOperation({
    operationId: 'createTeam',
    summary: 'Crear un equipo',
    description:
      'Registra un equipo y asigna al usuario autenticado como owner de la asociación.',
  })
  @ApiCreatedResponse({ type: TeamResponseDto })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() createTeamDto: CreateTeamDto,
  ): Promise<TeamResponseDto> {
    return this.teamsService.create(request.user.id, createTeamDto);
  }

  @Get('mine')
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Party Reference Data Directory')
  @ApiExtension('x-bian-action-term', 'Retrieve')
  @ApiOperation({
    operationId: 'listMyTeams',
    summary: 'Consultar mis equipos',
    description:
      'Recupera los equipos asociados al usuario autenticado como owner, editor o lector.',
  })
  @ApiOkResponse({ type: TeamResponseDto, isArray: true })
  listMine(@Req() request: AuthenticatedRequest): Promise<TeamResponseDto[]> {
    return this.teamsService.listMine(request.user.id);
  }

  @Get(':slug/members')
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Party Reference Data Directory')
  @ApiExtension('x-bian-action-term', 'Retrieve')
  @ApiOperation({
    operationId: 'listTeamMembersAndInvitations',
    summary: 'Consultar integrantes e invitaciones',
    description:
      'Consulta el owner, integrantes aceptados y el historial de invitaciones del equipo.',
  })
  @ApiParam({ name: 'slug', example: 'arpa-racing-team' })
  @ApiOkResponse({ type: TeamRosterEntryDto, isArray: true })
  listRoster(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<TeamRosterEntryDto[]> {
    return this.invitationsService.listRoster(request.user.id, slug);
  }

  @Post(':slug/invitations')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } })
  @ApiExtension('x-bian-service-domain', 'Party Reference Data Directory')
  @ApiExtension('x-bian-action-term', 'Register')
  @ApiOperation({
    operationId: 'inviteTeamMember',
    summary: 'Invitar un integrante',
    description:
      'Crea una invitación de un solo uso, conserva su historial y envía el enlace mediante Resend. Solo el owner del equipo puede realizarla.',
  })
  @ApiParam({ name: 'slug', example: 'arpa-racing-team' })
  @ApiCreatedResponse({ type: TeamRosterEntryDto })
  invite(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: CreateTeamInvitationDto,
  ): Promise<TeamRosterEntryDto> {
    return this.invitationsService.invite(request.user.id, slug, dto);
  }

  @Delete(':slug/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'removeTeamMember',
    summary: 'Expulsar un integrante',
    description:
      'Owners y editores pueden expulsar a otros integrantes. El owner nunca puede ser expulsado.',
  })
  @ApiNoContentResponse({ description: 'Integrante eliminado del equipo.' })
  removeMember(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Param('memberId') memberId: string,
  ): Promise<void> {
    return this.invitationsService.removeMember(
      request.user.id,
      slug,
      memberId,
    );
  }

  @Delete(':slug/invitations/:invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'cancelTeamInvitation',
    summary: 'Cancelar una invitación pendiente',
    description:
      'Owners y editores pueden cancelar invitaciones pendientes del equipo.',
  })
  @ApiNoContentResponse({ description: 'Invitación cancelada.' })
  cancelInvitation(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Param('invitationId') invitationId: string,
  ): Promise<void> {
    return this.invitationsService.cancelInvitation(
      request.user.id,
      slug,
      invitationId,
    );
  }

  @Get(':slug')
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Party Reference Data Directory')
  @ApiExtension('x-bian-action-term', 'Retrieve')
  @ApiOperation({
    operationId: 'getMyTeamBySlug',
    summary: 'Consultar un equipo propio',
  })
  @ApiParam({ name: 'slug', example: 'arpa-racing-team' })
  @ApiOkResponse({ type: TeamResponseDto })
  getMineBySlug(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<TeamResponseDto> {
    return this.teamsService.getMineBySlug(request.user.id, slug);
  }

  @Patch(':slug')
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Party Reference Data Directory')
  @ApiExtension('x-bian-action-term', 'Update')
  @ApiOperation({
    operationId: 'updateOwnedTeam',
    summary: 'Actualizar un equipo',
    description:
      'Actualiza la información, el logo y la portada. Solo el owner del equipo puede realizar esta operación.',
  })
  @ApiParam({ name: 'slug', example: 'arpa-racing-team' })
  @ApiOkResponse({ type: TeamResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    return this.teamsService.update(request.user.id, slug, dto);
  }

  @Post(':slug/ownership-transfers')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } })
  @ApiOperation({
    operationId: 'requestTeamOwnershipTransfer',
    summary: 'Invitar a un nuevo propietario',
    description:
      'Solo el propietario actual puede crear la invitación. El destinatario debe tener una cuenta activa y aceptar desde su correo.',
  })
  @ApiParam({ name: 'slug', example: 'arpa-racing-team' })
  @ApiCreatedResponse({ type: TeamOwnershipTransferResponseDto })
  transferOwnership(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: CreateTeamOwnershipTransferDto,
  ) {
    return this.ownershipTransfersService.invite(request.user.id, slug, dto);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Party Reference Data Directory')
  @ApiExtension('x-bian-action-term', 'Control')
  @ApiOperation({
    operationId: 'archiveOwnedTeam',
    summary: 'Dar de baja un equipo',
    description:
      'Realiza una baja lógica, conserva los datos y cancela invitaciones pendientes. El equipo deja de ser visible para todos sus integrantes. Solo el owner puede realizarla.',
  })
  @ApiParam({ name: 'slug', example: 'arpa-racing-team' })
  @ApiNoContentResponse({ description: 'Equipo archivado correctamente.' })
  archive(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: ArchiveTeamDto,
  ): Promise<void> {
    return this.teamsService.archive(request.user.id, slug, dto);
  }
}

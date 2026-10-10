import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtension,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { UserRole } from '../users/schemas/user.schema';
import { CreateTeamDto } from './dto/create-team.dto';
import { CreateTeamInvitationDto } from './dto/create-team-invitation.dto';
import { TeamResponseDto } from './dto/team-response.dto';
import { TeamRosterEntryDto } from './dto/team-roster-entry.dto';
import { TeamInvitationsService } from './team-invitations.service';
import { TeamsService } from './teams.service';

@ApiTags('Teams / Party Reference Data Directory')
@Controller({ path: 'teams', version: '1' })
@Roles(UserRole.OWNER, UserRole.EDITOR, UserRole.READER)
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly invitationsService: TeamInvitationsService,
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
}

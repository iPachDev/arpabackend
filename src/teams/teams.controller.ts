import { Body, Controller, Get, Header, Param, Post, Req } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtension,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { UserRole } from '../users/schemas/user.schema';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamResponseDto } from './dto/team-response.dto';
import { TeamsService } from './teams.service';

@ApiTags('Teams / Party Reference Data Directory')
@Controller({ path: 'teams', version: '1' })
@Roles(UserRole.OWNER, UserRole.EDITOR, UserRole.READER)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

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
      'Recupera los equipos asociados al usuario autenticado. En esta versión son los equipos que creó como owner.',
  })
  @ApiOkResponse({ type: TeamResponseDto, isArray: true })
  listMine(
    @Req() request: AuthenticatedRequest,
  ): Promise<TeamResponseDto[]> {
    return this.teamsService.listMine(request.user.id);
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


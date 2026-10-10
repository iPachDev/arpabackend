import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { UserRole } from '../users/schemas/user.schema';
import { AcceptTeamInvitationResponseDto } from './dto/accept-team-invitation-response.dto';
import { TeamInvitationPreviewDto } from './dto/team-invitation-preview.dto';
import { TeamInvitationsService } from './team-invitations.service';

@ApiTags('Team Invitations / Party Reference Data Directory')
@Controller({ path: 'team-invitations', version: '1' })
export class TeamInvitationsController {
  constructor(private readonly invitationsService: TeamInvitationsService) {}

  @Get(':token')
  @Public()
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    operationId: 'getTeamInvitation',
    summary: 'Consultar una invitación',
    description:
      'Valida el token y devuelve el contexto mínimo para registro, login o aceptación.',
  })
  @ApiParam({ name: 'token', description: 'Token opaco recibido por correo.' })
  @ApiOkResponse({ type: TeamInvitationPreviewDto })
  preview(@Param('token') token: string): Promise<TeamInvitationPreviewDto> {
    return this.invitationsService.preview(token);
  }

  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.OWNER, UserRole.EDITOR, UserRole.READER)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    operationId: 'acceptTeamInvitation',
    summary: 'Aceptar una invitación',
    description:
      'Comprueba que el correo autenticado sea el invitado y lo añade al equipo con el rol asignado.',
  })
  @ApiParam({ name: 'token', description: 'Token opaco recibido por correo.' })
  @ApiOkResponse({ type: AcceptTeamInvitationResponseDto })
  accept(
    @Param('token') token: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<AcceptTeamInvitationResponseDto> {
    return this.invitationsService.accept(
      token,
      request.user.id,
      request.user.email,
    );
  }
}

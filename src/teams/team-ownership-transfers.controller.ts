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
import {
  AcceptTeamOwnershipTransferResponseDto,
  TeamOwnershipTransferPreviewDto,
} from './dto/team-ownership-transfer.dto';
import { TeamOwnershipTransfersService } from './team-ownership-transfers.service';

@ApiTags('Team Ownership Transfers / Party Reference Data Directory')
@Controller({ path: 'team-ownership-transfers', version: '1' })
export class TeamOwnershipTransfersController {
  constructor(
    private readonly transfersService: TeamOwnershipTransfersService,
  ) {}

  @Get(':token')
  @Public()
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    operationId: 'getTeamOwnershipTransfer',
    summary: 'Consultar una transferencia de propiedad',
  })
  @ApiParam({ name: 'token', description: 'Token opaco recibido por correo.' })
  @ApiOkResponse({ type: TeamOwnershipTransferPreviewDto })
  preview(@Param('token') token: string) {
    return this.transfersService.preview(token);
  }

  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.OWNER, UserRole.EDITOR, UserRole.READER)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    operationId: 'acceptTeamOwnershipTransfer',
    summary: 'Aceptar la propiedad de un equipo',
  })
  @ApiParam({ name: 'token', description: 'Token opaco recibido por correo.' })
  @ApiOkResponse({ type: AcceptTeamOwnershipTransferResponseDto })
  accept(@Param('token') token: string, @Req() request: AuthenticatedRequest) {
    return this.transfersService.accept(
      token,
      request.user.id,
      request.user.email,
    );
  }
}

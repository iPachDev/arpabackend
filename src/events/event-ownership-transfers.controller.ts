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
  ApiExtension,
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
import { EventOwnershipTransferPreviewDto } from './dto/event-ownership-transfer-preview.dto';
import { AcceptEventOwnershipTransferResponseDto } from './dto/event-ownership-transfer-response.dto';
import { EventOwnershipTransfersService } from './event-ownership-transfers.service';

@ApiTags('Event Ownership Transfers / Promotional Events')
@Controller({ path: 'event-ownership-transfers', version: '1' })
export class EventOwnershipTransfersController {
  constructor(
    private readonly transfersService: EventOwnershipTransfersService,
  ) {}

  @Get(':token')
  @Public()
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiExtension('x-bian-service-domain', 'Promotional Events')
  @ApiExtension('x-bian-action-term', 'Retrieve')
  @ApiOperation({
    operationId: 'getEventOwnershipTransfer',
    summary: 'Consultar una transferencia de propiedad',
    description:
      'Ruta pública limitada al contexto necesario para mostrar y aceptar la invitación.',
  })
  @ApiParam({ name: 'token', description: 'Token opaco recibido por correo.' })
  @ApiOkResponse({ type: EventOwnershipTransferPreviewDto })
  preview(@Param('token') token: string) {
    return this.transfersService.preview(token);
  }

  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.OWNER, UserRole.EDITOR, UserRole.READER)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiExtension('x-bian-service-domain', 'Promotional Events')
  @ApiExtension('x-bian-action-term', 'Update')
  @ApiOperation({
    operationId: 'acceptEventOwnershipTransfer',
    summary: 'Aceptar la propiedad de un evento',
    description:
      'Exige una sesión cuyo usuario y correo coincidan con el destinatario. La propiedad cambia únicamente al aceptar.',
  })
  @ApiParam({ name: 'token', description: 'Token opaco recibido por correo.' })
  @ApiOkResponse({ type: AcceptEventOwnershipTransferResponseDto })
  accept(@Param('token') token: string, @Req() request: AuthenticatedRequest) {
    return this.transfersService.accept(
      token,
      request.user.id,
      request.user.email,
    );
  }
}

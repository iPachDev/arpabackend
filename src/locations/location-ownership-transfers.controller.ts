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
import {
  AcceptLocationOwnershipTransferResponseDto,
  LocationOwnershipTransferPreviewDto,
} from './dto/location-ownership-transfer.dto';
import { LocationOwnershipTransfersService } from './location-ownership-transfers.service';

@ApiTags('Location Ownership Transfers / Location Data Management')
@Controller({ path: 'location-ownership-transfers', version: '1' })
export class LocationOwnershipTransfersController {
  constructor(
    private readonly transfersService: LocationOwnershipTransfersService,
  ) {}

  @Get(':token')
  @Public()
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiExtension('x-bian-service-domain', 'Location Data Management')
  @ApiExtension('x-bian-action-term', 'Retrieve')
  @ApiOperation({
    operationId: 'getLocationOwnershipTransfer',
    summary: 'Consultar una transferencia de ubicación',
    description:
      'Ruta pública limitada a los datos necesarios para mostrar la invitación.',
  })
  @ApiParam({ name: 'token', description: 'Token opaco recibido por correo.' })
  @ApiOkResponse({ type: LocationOwnershipTransferPreviewDto })
  preview(@Param('token') token: string) {
    return this.transfersService.preview(token);
  }

  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.OWNER, UserRole.EDITOR, UserRole.READER)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiExtension('x-bian-service-domain', 'Location Data Management')
  @ApiExtension('x-bian-action-term', 'Update')
  @ApiOperation({
    operationId: 'acceptLocationOwnershipTransfer',
    summary: 'Aceptar la propiedad de una ubicación',
    description:
      'La sesión debe pertenecer al usuario y correo invitados. La propiedad cambia solo al aceptar.',
  })
  @ApiParam({ name: 'token', description: 'Token opaco recibido por correo.' })
  @ApiOkResponse({ type: AcceptLocationOwnershipTransferResponseDto })
  accept(@Param('token') token: string, @Req() request: AuthenticatedRequest) {
    return this.transfersService.accept(
      token,
      request.user.id,
      request.user.email,
    );
  }
}

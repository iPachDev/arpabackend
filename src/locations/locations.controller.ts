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
import { ArchiveLocationDto } from './dto/archive-location.dto';
import { CreateLocationOwnershipTransferDto } from './dto/create-location-ownership-transfer.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { LocationOwnershipTransferResponseDto } from './dto/location-ownership-transfer.dto';
import { LocationResponseDto } from './dto/location-response.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationOwnershipTransfersService } from './location-ownership-transfers.service';
import { LocationsService } from './locations.service';

@ApiTags('Locations / Location Data Management')
@Controller({ path: 'locations', version: '1' })
@Roles(UserRole.OWNER, UserRole.EDITOR, UserRole.READER)
export class LocationsController {
  constructor(
    private readonly locationsService: LocationsService,
    private readonly transfersService: LocationOwnershipTransfersService,
  ) {}

  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Location Data Management')
  @ApiExtension('x-bian-action-term', 'Register')
  @ApiOperation({
    operationId: 'createLocation',
    summary: 'Crear una ubicación',
    description: 'El usuario autenticado queda como propietario del recurso.',
  })
  @ApiCreatedResponse({ type: LocationResponseDto })
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateLocationDto) {
    return this.locationsService.create(request.user.id, dto);
  }

  @Get('mine')
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Location Data Management')
  @ApiExtension('x-bian-action-term', 'Retrieve')
  @ApiOperation({
    operationId: 'listMyLocations',
    summary: 'Consultar mis ubicaciones activas',
  })
  @ApiOkResponse({ type: LocationResponseDto, isArray: true })
  listMine(@Req() request: AuthenticatedRequest) {
    return this.locationsService.listMine(request.user.id);
  }

  @Get(':slug')
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Location Data Management')
  @ApiExtension('x-bian-action-term', 'Retrieve')
  @ApiOperation({
    operationId: 'getOwnedLocation',
    summary: 'Consultar una ubicación propia',
  })
  @ApiParam({ name: 'slug', example: 'kartodromo-ciudad-arpa' })
  @ApiOkResponse({ type: LocationResponseDto })
  get(@Req() request: AuthenticatedRequest, @Param('slug') slug: string) {
    return this.locationsService.getBySlug(request.user.id, slug);
  }

  @Patch(':slug')
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Location Data Management')
  @ApiExtension('x-bian-action-term', 'Update')
  @ApiOperation({
    operationId: 'updateOwnedLocation',
    summary: 'Actualizar una ubicación propia',
    description: 'Solo el propietario actual puede modificarla.',
  })
  @ApiParam({ name: 'slug', example: 'kartodromo-ciudad-arpa' })
  @ApiOkResponse({ type: LocationResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationsService.update(request.user.id, slug, dto);
  }

  @Post(':slug/ownership-transfers')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } })
  @ApiExtension('x-bian-service-domain', 'Location Data Management')
  @ApiExtension('x-bian-action-term', 'Request')
  @ApiOperation({
    operationId: 'requestLocationOwnershipTransfer',
    summary: 'Invitar a un nuevo propietario',
    description:
      'Solo el propietario actual puede invitar. El destinatario debe tener una cuenta activa y aceptar desde su correo.',
  })
  @ApiParam({ name: 'slug', example: 'kartodromo-ciudad-arpa' })
  @ApiCreatedResponse({ type: LocationOwnershipTransferResponseDto })
  transfer(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: CreateLocationOwnershipTransferDto,
  ) {
    return this.transfersService.invite(request.user.id, slug, dto);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Location Data Management')
  @ApiExtension('x-bian-action-term', 'Control')
  @ApiOperation({
    operationId: 'archiveOwnedLocation',
    summary: 'Dar de baja una ubicación',
    description:
      'Baja lógica: conserva los datos, cancela transferencias pendientes y la oculta. Solo el propietario puede realizarla.',
  })
  @ApiParam({ name: 'slug', example: 'kartodromo-ciudad-arpa' })
  @ApiNoContentResponse({ description: 'Ubicación archivada correctamente.' })
  archive(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: ArchiveLocationDto,
  ) {
    return this.locationsService.archive(request.user.id, slug, dto);
  }
}

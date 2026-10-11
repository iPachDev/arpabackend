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
import { CreateEventDto } from './dto/create-event.dto';
import { ArchiveEventDto } from './dto/archive-event.dto';
import { CreateEventOwnershipTransferDto } from './dto/create-event-ownership-transfer.dto';
import { EventRegistrationResponseDto } from './dto/event-registration-response.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventOwnershipTransferResponseDto } from './dto/event-ownership-transfer-response.dto';
import { EventOwnershipTransfersService } from './event-ownership-transfers.service';
import { EventRegistrationsService } from './event-registrations.service';
import { EventsService } from './events.service';

@ApiTags('Events / Promotional Events')
@Controller({ path: 'events', version: '1' })
@Roles(UserRole.OWNER, UserRole.EDITOR, UserRole.READER)
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly registrationsService: EventRegistrationsService,
    private readonly transfersService: EventOwnershipTransfersService,
  ) {}

  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Promotional Events')
  @ApiExtension('x-bian-action-term', 'Register')
  @ApiOperation({
    operationId: 'createEvent',
    summary: 'Crear un evento',
    description:
      'Crea un evento con una o varias fechas y ubicación opcional por fecha. El usuario autenticado queda como propietario del recurso.',
  })
  @ApiCreatedResponse({ type: EventResponseDto })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateEventDto,
  ): Promise<EventResponseDto> {
    return this.eventsService.create(request.user.id, dto);
  }

  @Get('mine')
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Promotional Events')
  @ApiExtension('x-bian-action-term', 'Retrieve')
  @ApiOperation({
    operationId: 'listMyEvents',
    summary: 'Consultar mis eventos administrables',
  })
  @ApiOkResponse({ type: EventResponseDto, isArray: true })
  listMine(@Req() request: AuthenticatedRequest): Promise<EventResponseDto[]> {
    return this.eventsService.listMine(request.user.id);
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Promotional Events')
  @ApiExtension('x-bian-action-term', 'Retrieve')
  @ApiOperation({
    operationId: 'listPublishedEvents',
    summary: 'Explorar eventos publicados',
  })
  @ApiOkResponse({ type: EventResponseDto, isArray: true })
  listPublished(
    @Req() request: AuthenticatedRequest,
  ): Promise<EventResponseDto[]> {
    return this.eventsService.listPublished(request.user.id);
  }

  @Post(':slug/registrations')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Promotional Events')
  @ApiExtension('x-bian-action-term', 'Register')
  @ApiOperation({
    operationId: 'registerForEvent',
    summary: 'Inscribirse a un evento',
    description:
      'Crea o reactiva la inscripción, respetando fecha límite y cupo. Persiste una notificación y solicita el correo de confirmación.',
  })
  @ApiParam({ name: 'slug', example: 'copa-metropolitana-de-karting' })
  @ApiCreatedResponse({ type: EventRegistrationResponseDto })
  register(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<EventRegistrationResponseDto> {
    return this.registrationsService.register(request.user.id, slug);
  }

  @Delete(':slug/registrations/me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Promotional Events')
  @ApiExtension('x-bian-action-term', 'Control')
  @ApiOperation({
    operationId: 'cancelMyEventRegistration',
    summary: 'Cancelar mi inscripción',
    description:
      'Realiza una baja lógica, persiste una notificación y solicita el correo de cancelación.',
  })
  @ApiParam({ name: 'slug', example: 'copa-metropolitana-de-karting' })
  @ApiNoContentResponse()
  cancelRegistration(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<void> {
    return this.registrationsService.cancel(request.user.id, slug);
  }

  @Get(':slug')
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Promotional Events')
  @ApiExtension('x-bian-action-term', 'Retrieve')
  @ApiOperation({ operationId: 'getEvent', summary: 'Consultar un evento' })
  @ApiParam({ name: 'slug', example: 'copa-metropolitana-de-karting' })
  @ApiOkResponse({ type: EventResponseDto })
  getBySlug(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
  ): Promise<EventResponseDto> {
    return this.eventsService.getBySlug(request.user.id, slug);
  }

  @Patch(':slug')
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Promotional Events')
  @ApiExtension('x-bian-action-term', 'Update')
  @ApiOperation({
    operationId: 'updateEvent',
    summary: 'Actualizar un evento propio',
    description:
      'Actualiza únicamente un evento creado por el usuario autenticado.',
  })
  @ApiParam({ name: 'slug', example: 'copa-metropolitana-de-karting' })
  @ApiOkResponse({ type: EventResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    return this.eventsService.update(request.user.id, slug, dto);
  }

  @Post(':slug/ownership-transfers')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } })
  @ApiExtension('x-bian-service-domain', 'Promotional Events')
  @ApiExtension('x-bian-action-term', 'Request')
  @ApiOperation({
    operationId: 'requestEventOwnershipTransfer',
    summary: 'Invitar a un nuevo propietario',
    description:
      'Solo el propietario actual puede crear la invitación. El destinatario debe tener una cuenta activa y aceptar desde el correo invitado.',
  })
  @ApiParam({ name: 'slug', example: 'copa-metropolitana-de-karting' })
  @ApiCreatedResponse({ type: EventOwnershipTransferResponseDto })
  transferOwnership(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: CreateEventOwnershipTransferDto,
  ) {
    return this.transfersService.invite(request.user.id, slug, dto);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Promotional Events')
  @ApiExtension('x-bian-action-term', 'Control')
  @ApiOperation({
    operationId: 'archiveOwnedEvent',
    summary: 'Dar de baja un evento',
    description:
      'Realiza una baja lógica, conserva datos e inscripciones, cancela transferencias pendientes y oculta el evento. Solo el propietario puede realizarla.',
  })
  @ApiParam({ name: 'slug', example: 'copa-metropolitana-de-karting' })
  @ApiNoContentResponse({ description: 'Evento archivado correctamente.' })
  archive(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: ArchiveEventDto,
  ): Promise<void> {
    return this.eventsService.archive(request.user.id, slug, dto);
  }
}

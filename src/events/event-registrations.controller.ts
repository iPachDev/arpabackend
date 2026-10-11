import { Controller, Get, Header, Req } from '@nestjs/common';
import {
  ApiExtension,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { UserRole } from '../users/schemas/user.schema';
import { EventRegistrationResponseDto } from './dto/event-registration-response.dto';
import { EventRegistrationsService } from './event-registrations.service';

@ApiTags('Event Registrations / Promotional Events')
@Controller({ path: 'event-registrations', version: '1' })
@Roles(UserRole.OWNER, UserRole.EDITOR, UserRole.READER)
export class EventRegistrationsController {
  constructor(
    private readonly registrationsService: EventRegistrationsService,
  ) {}

  @Get('mine')
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Promotional Events')
  @ApiExtension('x-bian-action-term', 'Retrieve')
  @ApiOperation({
    operationId: 'listMyEventRegistrations',
    summary: 'Consultar mis inscripciones',
  })
  @ApiOkResponse({ type: EventRegistrationResponseDto, isArray: true })
  listMine(
    @Req() request: AuthenticatedRequest,
  ): Promise<EventRegistrationResponseDto[]> {
    return this.registrationsService.listMine(request.user.id);
  }
}

import { Controller, Get, Header, Param, Patch, Req } from '@nestjs/common';
import {
  ApiExtension,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { UserRole } from '../users/schemas/user.schema';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications / Customer Event History')
@Roles(UserRole.OWNER, UserRole.EDITOR, UserRole.READER)
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('mine')
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Customer Event History')
  @ApiExtension('x-bian-action-term', 'Retrieve')
  @ApiOperation({
    operationId: 'listMyNotifications',
    summary: 'Consultar mis notificaciones',
    description:
      'Ruta privada. Devuelve las notificaciones del usuario autenticado.',
  })
  @ApiOkResponse({ type: NotificationResponseDto, isArray: true })
  listMine(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.listMine(request.user.id);
  }

  @Patch(':id/read')
  @Header('Cache-Control', 'no-store')
  @ApiExtension('x-bian-service-domain', 'Customer Event History')
  @ApiExtension('x-bian-action-term', 'Update')
  @ApiOperation({
    operationId: 'markNotificationAsRead',
    summary: 'Marcar una notificación como leída',
    description:
      'Ruta privada. Solo permite actualizar una notificación propia.',
  })
  @ApiOkResponse({ type: NotificationResponseDto })
  markAsRead(
    @Req() request: AuthenticatedRequest,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(
      request.user.id,
      notificationId,
    );
  }
}

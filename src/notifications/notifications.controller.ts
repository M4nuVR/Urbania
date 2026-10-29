import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../common/auth/auth.guard';
import { CurrentPrincipal } from '../common/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/report-access';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';

@ApiTags('Notificaciones')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // Coordinar con Persona 1: si UsersController define GET /users/:id con
  // ParseUUIDPipe, "me" no debe caer en esa ruta.
  @Get('users/me/notifications')
  @ApiOperation({ summary: 'Listar mis notificaciones' })
  findMine(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notifications.findMine(principal.id, query);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Marcar una notificación propia como leída' })
  @ApiOkResponse({ type: Notification })
  @ApiNotFoundResponse({ description: 'No existe o no es tuya' })
  markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.notifications.markAsRead(id, principal.id);
  }
}

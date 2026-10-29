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
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../common/auth/auth-user.js';
import { AuthGuard } from '../common/auth/auth.guard.js';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';
import { NotificationsService } from './notifications.service.js';

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
    @CurrentUser() user: AuthUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notifications.findMine(user.id, query);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Marcar una notificación propia como leída' })
  @ApiNotFoundResponse({ description: 'No existe o no es tuya' })
  markAsRead(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.notifications.markAsRead(id, user.id);
  }
}

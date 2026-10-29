import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ReportAccessService } from '../assignments/report-access.service.js';
import type { AuthUser } from '../common/auth/auth-user.js';
import { AuthGuard } from '../common/auth/auth.guard.js';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import { Roles } from '../common/auth/roles.decorator.js';
import { RolesGuard } from '../common/auth/roles.guard.js';
import { Role } from '../generated/prisma/enums.js';
import { ChangeStatusDto } from './dto/change-status.dto.js';
import { TrackingService } from './tracking.service.js';

@ApiTags('Seguimiento')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('reports/:id')
export class TrackingController {
  constructor(
    private readonly tracking: TrackingService,
    private readonly access: ReportAccessService,
  ) {}

  // Ruta única para cambiar el estado: Persona 2 no debe exponer otra.
  @Patch('status')
  @Roles(Role.ADMIN, Role.AUTHORITY)
  @ApiOperation({ summary: 'Cambiar el estado del reporte' })
  @ApiNotFoundResponse({ description: 'Reporte inexistente' })
  @ApiForbiddenResponse({ description: 'Ciudadano o autoridad no asignada' })
  @ApiConflictResponse({
    description:
      'Salto de estado, mismo estado, reporte resuelto o sin asignación',
  })
  @ApiBadRequestResponse({ description: 'Falta la observación al resolver' })
  changeStatus(
    @Param('id', new ParseUUIDPipe()) reportId: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tracking.changeStatus(reportId, dto, user);
  }

  @Get('tracking')
  @ApiOperation({ summary: 'Consultar el historial de estados del reporte' })
  async findAll(
    @Param('id', new ParseUUIDPipe()) reportId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.access.assertCanView(reportId, user);
    return this.tracking.findByReport(reportId);
  }
}

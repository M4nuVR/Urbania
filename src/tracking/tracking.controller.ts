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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ReportAccessService } from '../assignments/report-access.service';
import { AuthGuard } from '../common/auth/auth.guard';
import { Roles } from '../common/auth/roles';
import { RolesGuard } from '../common/auth/roles.guard';
import { CurrentPrincipal } from '../common/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/report-access';
import { Role } from '../users/user.entity';
import { ChangeStatusDto } from './dto/change-status.dto';
import { Tracking } from './tracking.entity';
import { TrackingService } from './tracking.service';

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
  @ApiOkResponse({ type: Tracking })
  @ApiNotFoundResponse({ description: 'Reporte inexistente' })
  @ApiForbiddenResponse({ description: 'Ciudadano o autoridad no asignada' })
  @ApiConflictResponse({
    description:
      'Salto de estado, mismo estado, reporte resuelto o sin asignación',
  })
  @ApiBadRequestResponse({ description: 'Falta la observación al resolver' })
  changeStatus(
    @Param('id', ParseUUIDPipe) reportId: string,
    @Body() dto: ChangeStatusDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.tracking.changeStatus(reportId, dto, principal);
  }

  @Get('tracking')
  @ApiOperation({ summary: 'Consultar el historial de estados del reporte' })
  @ApiOkResponse({ type: Tracking, isArray: true })
  async findAll(
    @Param('id', ParseUUIDPipe) reportId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    await this.access.assertCanView(reportId, principal);
    return this.tracking.findByReport(reportId);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../common/auth/auth.guard';
import { Roles } from '../common/auth/roles';
import { RolesGuard } from '../common/auth/roles.guard';
import { CurrentPrincipal } from '../common/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/report-access';
import { Role } from '../users/user.entity';
import { Assignment } from './assignment.entity';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReportAccessService } from './report-access.service';

@ApiTags('Asignaciones')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('reports/:id')
export class AssignmentsController {
  constructor(
    private readonly assignments: AssignmentsService,
    private readonly access: ReportAccessService,
  ) {}

  @Post('assign')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Administrador asigna una autoridad al reporte' })
  @ApiCreatedResponse({ type: Assignment })
  @ApiNotFoundResponse({ description: 'Reporte o usuario inexistente' })
  @ApiConflictResponse({ description: 'Reporte resuelto o ya asignado' })
  @ApiUnprocessableEntityResponse({ description: 'El usuario no es AUTHORITY' })
  @ApiForbiddenResponse({ description: 'Solo administradores' })
  assign(
    @Param('id', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateAssignmentDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.assignments.assign(reportId, dto, principal.id);
  }

  @Get('assignment')
  @ApiOperation({ summary: 'Consultar la autoridad responsable del reporte' })
  @ApiOkResponse({ type: Assignment })
  @ApiNotFoundResponse({ description: 'Reporte inexistente o sin asignación' })
  async findOne(
    @Param('id', ParseUUIDPipe) reportId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    await this.access.assertCanView(reportId, principal);
    return this.assignments.findByReport(reportId);
  }
}

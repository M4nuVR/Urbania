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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../common/auth/auth-user.js';
import { AuthGuard } from '../common/auth/auth.guard.js';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import { Roles } from '../common/auth/roles.decorator.js';
import { RolesGuard } from '../common/auth/roles.guard.js';
import { Role } from '../generated/prisma/enums.js';
import { AssignmentsService } from './assignments.service.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { ReportAccessService } from './report-access.service.js';

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
  @ApiNotFoundResponse({ description: 'Reporte o usuario inexistente' })
  @ApiConflictResponse({ description: 'Reporte resuelto o ya asignado' })
  @ApiUnprocessableEntityResponse({ description: 'El usuario no es AUTHORITY' })
  @ApiForbiddenResponse({ description: 'Solo administradores' })
  assign(
    @Param('id', new ParseUUIDPipe()) reportId: string,
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assignments.assign(reportId, dto, user.id);
  }

  @Get('assignment')
  @ApiOperation({ summary: 'Consultar la autoridad responsable del reporte' })
  @ApiNotFoundResponse({ description: 'Reporte inexistente o sin asignación' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) reportId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.access.assertCanView(reportId, user);
    return this.assignments.findByReport(reportId);
  }
}

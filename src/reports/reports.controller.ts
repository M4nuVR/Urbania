import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentPrincipal } from '../common/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/report-access';
import { CreateReportDto } from './dto/create-report.dto';
import { ListReportsQueryDto } from './dto/list-reports-query.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Report } from './report.entity';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un reporte urbano' })
  @ApiCreatedResponse({ type: Report })
  @ApiBadRequestResponse({ description: 'Datos invalidos' })
  create(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: CreateReportDto,
  ): Promise<Report> {
    return this.reportsService.create(principal, input);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar reportes',
    description: 'Un ciudadano ve los suyos; un administrador ve todos.',
  })
  @ApiOkResponse({ type: Report, isArray: true })
  findAll(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query() query: ListReportsQueryDto,
  ): Promise<Report[]> {
    return this.reportsService.findAll(principal, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar un reporte' })
  @ApiOkResponse({ type: Report })
  @ApiForbiddenResponse({
    description: 'Sin permiso para consultar el reporte',
  })
  @ApiNotFoundResponse({ description: 'Reporte no encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<Report> {
    return this.reportsService.findOne(id, principal);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar un reporte propio mientras este REPORTED',
  })
  @ApiOkResponse({ type: Report })
  @ApiConflictResponse({
    description: 'El reporte ya no permite modificaciones',
  })
  @ApiForbiddenResponse({ description: 'El ciudadano no es propietario' })
  @ApiNotFoundResponse({ description: 'Reporte no encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: UpdateReportDto,
  ): Promise<Report> {
    return this.reportsService.update(id, principal, input);
  }

  // El cambio de estado vive en TrackingModule (PATCH /reports/:id/status):
  // valida la transicion, guarda el historial y notifica en una transaccion.
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentPrincipal } from '../common/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/report-access';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { Evidence } from './evidence.entity';
import { EvidencesService } from './evidences.service';

@ApiTags('evidences')
@ApiBearerAuth()
@Controller()
export class EvidencesController {
  constructor(private readonly evidencesService: EvidencesService) {}

  @Post('reports/:id/evidences')
  @ApiOperation({
    summary: 'Registrar metadatos de una evidencia por URL',
    description:
      'Guarda solo la URL. No carga, inspecciona ni elimina archivos remotos.',
  })
  @ApiCreatedResponse({ type: Evidence })
  @ApiBadRequestResponse({ description: 'URL invalida o protocolo no permitido' })
  @ApiForbiddenResponse({ description: 'El ciudadano no es propietario' })
  @ApiNotFoundResponse({ description: 'Reporte no encontrado' })
  create(
    @Param('id', ParseUUIDPipe) reportId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: CreateEvidenceDto,
  ): Promise<Evidence> {
    return this.evidencesService.create(reportId, principal, input);
  }

  @Get('reports/:id/evidences')
  @ApiOperation({ summary: 'Consultar evidencias de un reporte autorizado' })
  @ApiOkResponse({ type: Evidence, isArray: true })
  @ApiForbiddenResponse({ description: 'Sin permiso para consultar el reporte' })
  @ApiNotFoundResponse({ description: 'Reporte no encontrado' })
  find(
    @Param('id', ParseUUIDPipe) reportId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<Evidence[]> {
    return this.evidencesService.findForReport(reportId, principal);
  }

  @Delete('evidences/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar los metadatos de una evidencia propia' })
  @ApiNoContentResponse({
    description: 'Metadatos eliminados; el archivo remoto permanece',
  })
  @ApiForbiddenResponse({ description: 'El ciudadano no es propietario' })
  @ApiNotFoundResponse({ description: 'Evidencia o reporte no encontrados' })
  remove(
    @Param('id', ParseUUIDPipe) evidenceId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<void> {
    return this.evidencesService.remove(evidenceId, principal);
  }
}

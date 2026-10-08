import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location } from './location.entity';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@ApiBearerAuth()
@Controller('reports/:id/location')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar la ubicacion de un reporte' })
  @ApiCreatedResponse({ type: Location })
  @ApiBadRequestResponse({
    description: 'Coordenadas incompletas o sin referencia textual util',
  })
  @ApiConflictResponse({
    description: 'El reporte ya tiene ubicacion o ya no esta REPORTED',
  })
  @ApiForbiddenResponse({ description: 'El ciudadano no es propietario' })
  @ApiNotFoundResponse({ description: 'Reporte no encontrado' })
  create(
    @Param('id', ParseUUIDPipe) reportId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: CreateLocationDto,
  ): Promise<Location> {
    return this.locationsService.create(reportId, principal, input);
  }

  @Get()
  @ApiOperation({ summary: 'Consultar la ubicacion de un reporte autorizado' })
  @ApiOkResponse({ type: Location })
  @ApiForbiddenResponse({ description: 'Sin permiso para consultar el reporte' })
  @ApiNotFoundResponse({ description: 'Reporte o ubicacion no encontrados' })
  find(
    @Param('id', ParseUUIDPipe) reportId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<Location> {
    return this.locationsService.findForReport(reportId, principal);
  }

  @Patch()
  @ApiOperation({
    summary: 'Actualizar la ubicacion mientras el reporte este REPORTED',
  })
  @ApiOkResponse({ type: Location })
  @ApiBadRequestResponse({
    description: 'Coordenadas incompletas, body vacio o sin referencia textual util',
  })
  @ApiConflictResponse({ description: 'El reporte ya no permite modificaciones' })
  @ApiForbiddenResponse({ description: 'El ciudadano no es propietario' })
  @ApiNotFoundResponse({ description: 'Reporte o ubicacion no encontrados' })
  update(
    @Param('id', ParseUUIDPipe) reportId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: UpdateLocationDto,
  ): Promise<Location> {
    return this.locationsService.update(reportId, principal, input);
  }
}

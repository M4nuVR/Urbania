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
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
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
  @ApiOperation({ summary: 'Registrar la ubicación de un reporte' })
  @ApiCreatedResponse({ type: Location })
  create(
    @Param('id', ParseUUIDPipe) reportId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: CreateLocationDto,
  ): Promise<Location> {
    return this.locationsService.create(reportId, principal, input);
  }

  @Get()
  @ApiOperation({ summary: 'Consultar la ubicación de un reporte autorizado' })
  @ApiNotFoundResponse({ description: 'Reporte o ubicación no encontrados' })
  find(
    @Param('id', ParseUUIDPipe) reportId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<Location> {
    return this.locationsService.findForReport(reportId, principal);
  }

  @Patch()
  @ApiOperation({
    summary: 'Corregir la ubicación mientras el reporte esté REPORTED',
  })
  update(
    @Param('id', ParseUUIDPipe) reportId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: UpdateLocationDto,
  ): Promise<Location> {
    return this.locationsService.update(reportId, principal, input);
  }
}

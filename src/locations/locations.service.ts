import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { QueryFailedError, Repository } from 'typeorm';
import { AuthenticatedPrincipal } from '../common/report-access';
import { ReportAuthorizationService } from '../common/report-authorization.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location } from './location.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locations: Repository<Location>,
    private readonly reportAuthorization: ReportAuthorizationService,
  ) {}

  async create(
    reportId: string,
    principal: AuthenticatedPrincipal,
    input: CreateLocationDto,
  ): Promise<Location> {
    await this.reportAuthorization.authorizeModification(reportId, principal);
    this.validateLocation(input);

    if (await this.locations.findOneBy({ reportId })) {
      throw new ConflictException('El reporte ya tiene una ubicacion');
    }

    const location = this.locations.create({
      id: randomUUID(),
      reportId,
      address: input.address ?? null,
      neighborhood: input.neighborhood ?? null,
      zone: input.zone ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    });

    try {
      return await this.locations.save(location);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('El reporte ya tiene una ubicacion');
      }
      throw error;
    }
  }

  async findForReport(
    reportId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<Location> {
    await this.reportAuthorization.authorizeRead(reportId, principal);
    const location = await this.locations.findOneBy({ reportId });
    if (!location) {
      throw new NotFoundException('El reporte no tiene ubicacion registrada');
    }
    return location;
  }

  async update(
    reportId: string,
    principal: AuthenticatedPrincipal,
    input: UpdateLocationDto,
  ): Promise<Location> {
    await this.reportAuthorization.authorizeModification(reportId, principal);
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('Debes enviar al menos un campo');
    }

    const location = await this.locations.findOneBy({ reportId });
    if (!location) {
      throw new NotFoundException('El reporte no tiene ubicacion registrada');
    }

    const updated = { ...location, ...input };
    this.validateLocation(updated);
    return this.locations.save(updated);
  }

  private validateLocation(input: {
    address?: string | null;
    neighborhood?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }): void {
    if (!input.address?.trim() && !input.neighborhood?.trim()) {
      throw new BadRequestException(
        'La direccion o el barrio son obligatorios',
      );
    }
    if ((input.latitude == null) !== (input.longitude == null)) {
      throw new BadRequestException('Debes enviar latitud y longitud juntas');
    }
  }
}

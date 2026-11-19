import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CategoriesService } from '../categories/categories.service';
import { AuthenticatedPrincipal } from '../common/report-access';
import { UserRole } from '../users/user.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { ListReportsQueryDto } from './dto/list-reports-query.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Report, ReportStatus } from './report.entity';

// Transiciones permitidas para un administrador; RESOLVED y REJECTED son finales
const STATUS_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  [ReportStatus.REPORTED]: [ReportStatus.IN_PROGRESS, ReportStatus.REJECTED],
  [ReportStatus.IN_PROGRESS]: [ReportStatus.RESOLVED, ReportStatus.REJECTED],
  [ReportStatus.RESOLVED]: [],
  [ReportStatus.REJECTED]: [],
};

export function isAdmin(principal: AuthenticatedPrincipal): boolean {
  return principal.roles.includes(UserRole.ADMIN);
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reports: Repository<Report>,
    private readonly categories: CategoriesService,
  ) {}

  async create(
    principal: AuthenticatedPrincipal,
    input: CreateReportDto,
  ): Promise<Report> {
    // 404 si no existe, 400 si está desactivada
    const category = await this.categories.findActiveById(input.categoryId);
    return this.reports.save(
      this.reports.create({
        id: randomUUID(),
        ownerId: principal.id,
        title: input.title.trim(),
        description: input.description.trim(),
        categoryId: category.id,
        category,
        status: ReportStatus.REPORTED,
      }),
    );
  }

  // Un ciudadano ve solo sus reportes; un administrador ve todos
  findAll(
    principal: AuthenticatedPrincipal,
    query: ListReportsQueryDto,
  ): Promise<Report[]> {
    const where: FindOptionsWhere<Report> = {};
    if (!isAdmin(principal)) {
      where.ownerId = principal.id;
    }
    if (query.status) {
      where.status = query.status;
    }
    // El filtro de categoría se suma al de propietario, nunca lo sustituye
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    return this.reports.find({
      where,
      relations: { category: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    id: string,
    principal: AuthenticatedPrincipal,
  ): Promise<Report> {
    const report = await this.getById(id);
    if (report.ownerId !== principal.id && !isAdmin(principal)) {
      throw new ForbiddenException(
        'No tienes permiso para consultar este reporte',
      );
    }
    return report;
  }

  async update(
    id: string,
    principal: AuthenticatedPrincipal,
    input: UpdateReportDto,
  ): Promise<Report> {
    if (Object.values(input).every((value) => value === undefined)) {
      throw new BadRequestException('Debes enviar al menos un campo');
    }

    const report = await this.getById(id);
    if (report.ownerId !== principal.id) {
      throw new ForbiddenException(
        'Solo el propietario puede modificar este reporte',
      );
    }
    if (report.status !== ReportStatus.REPORTED) {
      throw new ConflictException('El reporte ya no permite modificaciones');
    }

    const changes: Partial<Report> = {};
    // null se ignora en título y descripción, como antes del cambio
    if (input.title != null) changes.title = input.title.trim();
    if (input.description != null) {
      changes.description = input.description.trim();
    }
    // Solo se valida un cambio real de categoría: un reporte puede conservar
    // (o reenviar) una categoría que fue desactivada después.
    if (
      input.categoryId !== undefined &&
      input.categoryId !== report.categoryId
    ) {
      const category = await this.categories.findActiveById(input.categoryId);
      // Se reemplaza también la relación cargada para no guardar la antigua
      changes.categoryId = category.id;
      changes.category = category;
    }

    return this.reports.save({ ...report, ...changes });
  }

  async updateStatus(
    id: string,
    principal: AuthenticatedPrincipal,
    input: UpdateReportStatusDto,
  ): Promise<Report> {
    if (!isAdmin(principal)) {
      throw new ForbiddenException(
        'Solo un administrador puede cambiar el estado',
      );
    }

    const report = await this.getById(id);
    if (!STATUS_TRANSITIONS[report.status].includes(input.status)) {
      throw new ConflictException(
        `No se puede pasar de ${report.status} a ${input.status}`,
      );
    }

    return this.reports.save({ ...report, status: input.status });
  }

  findById(id: string): Promise<Report | null> {
    return this.reports.findOneBy({ id });
  }

  // Incluye la categoría aunque esté desactivada (consulta histórica)
  private async getById(id: string): Promise<Report> {
    const report = await this.reports.findOne({
      where: { id },
      relations: { category: true },
    });
    if (!report) {
      throw new NotFoundException('Reporte no encontrado');
    }
    return report;
  }
}

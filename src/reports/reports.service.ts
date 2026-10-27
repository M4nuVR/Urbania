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
  ) {}

  create(
    principal: AuthenticatedPrincipal,
    input: CreateReportDto,
  ): Promise<Report> {
    return this.reports.save(
      this.reports.create({
        id: randomUUID(),
        ownerId: principal.id,
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
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
    if (query.category) {
      where.category = query.category;
    }
    return this.reports.find({ where, order: { createdAt: 'DESC' } });
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
    if (Object.keys(input).length === 0) {
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

    return this.reports.save({
      ...report,
      ...input,
      title: input.title?.trim() ?? report.title,
      description: input.description?.trim() ?? report.description,
    });
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

  private async getById(id: string): Promise<Report> {
    const report = await this.findById(id);
    if (!report) {
      throw new NotFoundException('Reporte no encontrado');
    }
    return report;
  }
}

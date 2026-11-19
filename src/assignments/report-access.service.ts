import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hasRole } from '../common/auth/roles';
import type { AuthenticatedPrincipal } from '../common/report-access';
import { Report } from '../reports/report.entity';
import { UserRole } from '../users/user.entity';
import { Assignment } from './assignment.entity';

// "Usuario autorizado" para consultar responsable e historial de un reporte:
// el administrador, el ciudadano dueño o la autoridad asignada.
@Injectable()
export class ReportAccessService {
  constructor(
    @InjectRepository(Report)
    private readonly reports: Repository<Report>,
    @InjectRepository(Assignment)
    private readonly assignments: Repository<Assignment>,
  ) {}

  async assertCanView(
    reportId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<void> {
    const report = await this.reports.findOne({
      where: { id: reportId },
      select: { id: true, ownerId: true },
    });
    if (!report) throw new NotFoundException('Reporte no encontrado');

    const allowed =
      hasRole(principal, UserRole.ADMIN) ||
      report.ownerId === principal.id ||
      (await this.assignments.existsBy({
        reportId,
        authorityId: principal.id,
      }));
    if (!allowed) {
      throw new ForbiddenException('No tienes acceso a este reporte');
    }
  }
}

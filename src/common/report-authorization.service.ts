import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  AccessibleReport,
  AuthenticatedPrincipal,
  REPORT_ACCESS_PORT,
  ReportAccessPort,
} from './report-access';

@Injectable()
export class ReportAuthorizationService {
  constructor(private readonly moduleRef: ModuleRef) {}

  async authorizeRead(
    reportId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<AccessibleReport> {
    const reportAccess = this.getReportAccess();
    const report = await this.findReport(reportId, reportAccess);
    if (!(await reportAccess.canRead(principal, report))) {
      throw new ForbiddenException(
        'No tienes permiso para consultar este reporte',
      );
    }
    return report;
  }

  async authorizeModification(
    reportId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<AccessibleReport> {
    const reportAccess = this.getReportAccess();
    const report = await this.findReport(reportId, reportAccess);
    if (
      report.ownerId !== principal.id ||
      !(await reportAccess.canModify(principal, report))
    ) {
      throw new ForbiddenException(
        'Solo el propietario puede modificar este reporte',
      );
    }
    if (report.status !== 'REPORTED') {
      throw new ConflictException('El reporte ya no permite modificaciones');
    }
    return report;
  }

  private async findReport(
    reportId: string,
    reportAccess: ReportAccessPort,
  ): Promise<AccessibleReport> {
    const report = await reportAccess.findById(reportId);
    if (!report) {
      throw new NotFoundException('Reporte no encontrado');
    }
    return report;
  }

  private getReportAccess(): ReportAccessPort {
    try {
      const reportAccess = this.moduleRef.get<ReportAccessPort>(
        REPORT_ACCESS_PORT,
        {
          strict: false,
        },
      );
      if (reportAccess) {
        return reportAccess;
      }
    } catch {
      throw new ServiceUnavailableException(
        'El módulo de reportes aún no ha registrado su adaptador de permisos',
      );
    }
    throw new ServiceUnavailableException(
      'El módulo de reportes aún no ha registrado su adaptador de permisos',
    );
  }
}

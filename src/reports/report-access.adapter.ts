import { Injectable } from '@nestjs/common';
import {
  AccessibleReport,
  AuthenticatedPrincipal,
  ReportAccessPort,
} from '../common/report-access';
import { isAdmin, ReportsService } from './reports.service';

// Implementa el contrato que usan ubicaciones y evidencias para autorizar
@Injectable()
export class ReportAccessAdapter implements ReportAccessPort {
  constructor(private readonly reportsService: ReportsService) {}

  async findById(reportId: string): Promise<AccessibleReport | null> {
    const report = await this.reportsService.findById(reportId);
    if (!report) {
      return null;
    }
    return { id: report.id, ownerId: report.ownerId, status: report.status };
  }

  canRead(
    principal: AuthenticatedPrincipal,
    report: AccessibleReport,
  ): Promise<boolean> {
    return Promise.resolve(
      report.ownerId === principal.id || isAdmin(principal),
    );
  }

  canModify(
    principal: AuthenticatedPrincipal,
    report: AccessibleReport,
  ): Promise<boolean> {
    return Promise.resolve(report.ownerId === principal.id);
  }
}

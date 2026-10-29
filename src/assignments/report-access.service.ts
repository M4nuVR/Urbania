import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../common/auth/auth-user.js';
import { Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

// "Usuario autorizado" para consultar responsable e historial de un reporte:
// el administrador, el ciudadano dueño o la autoridad asignada.
@Injectable()
export class ReportAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanView(reportId: string, user: AuthUser): Promise<void> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: {
        citizenId: true,
        assignment: { select: { authorityId: true } },
      },
    });
    if (!report) throw new NotFoundException('Reporte no encontrado');

    const allowed =
      user.role === Role.ADMIN ||
      report.citizenId === user.id ||
      report.assignment?.authorityId === user.id;
    if (!allowed) {
      throw new ForbiddenException('No tienes acceso a este reporte');
    }
  }
}

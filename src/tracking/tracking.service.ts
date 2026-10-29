import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { NotificationType, ReportStatus } from '../generated/prisma/enums.js';
import type { AuthUser } from '../common/auth/auth-user.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChangeStatusDto } from './dto/change-status.dto.js';
import { assertTransitionAllowed, STATUS_LABEL } from './status-transitions.js';

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // Único punto de cambio de estado. En una transacción: valida, actualiza
  // Report.status condicionado al estado leído, registra Tracking y notifica al
  // ciudadano dueño. Si algo falla, se revierte todo.
  async changeStatus(reportId: string, dto: ChangeStatusDto, actor: AuthUser) {
    const observation = dto.observation || null;

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({
        where: { id: reportId },
        select: {
          title: true,
          status: true,
          citizenId: true,
          assignment: { select: { authorityId: true } },
        },
      });
      if (!report) throw new NotFoundException('Reporte no encontrado');

      assertTransitionAllowed({
        current: report.status,
        next: dto.newStatus,
        actor,
        assignedAuthorityId: report.assignment?.authorityId ?? null,
        observation,
      });

      // Control de concurrencia: si otra petición ya cambió el estado,
      // esta actualización no afecta filas y se rechaza.
      const { count } = await tx.report.updateMany({
        where: { id: reportId, status: report.status },
        data: { status: dto.newStatus },
      });
      if (count === 0) {
        throw new ConflictException(
          'El estado del reporte cambió mientras se procesaba la solicitud',
        );
      }

      const entry = await tx.tracking.create({
        data: {
          reportId,
          previousStatus: report.status,
          newStatus: dto.newStatus,
          changedBy: actor.id,
          observation,
        },
      });

      await this.notifications.create(
        {
          userId: report.citizenId,
          reportId,
          type: NotificationType.STATUS_CHANGED,
          message: `Tu reporte "${report.title}" pasó a ${STATUS_LABEL[dto.newStatus]}.`,
        },
        tx,
      );

      return entry;
    });
  }

  findByReport(reportId: string) {
    return this.prisma.tracking.findMany({
      where: { reportId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
  }

  // Para Persona 2: llamar dentro de la transacción que crea el reporte para
  // registrar la entrada inicial (previousStatus nulo).
  // Ejemplo: await trackingService.recordInitial(tx, report.id, citizenId);
  recordInitial(
    tx: Prisma.TransactionClient,
    reportId: string,
    citizenId: string,
  ) {
    return tx.tracking.create({
      data: {
        reportId,
        previousStatus: null,
        newStatus: ReportStatus.REPORTED,
        changedBy: citizenId,
      },
    });
  }
}

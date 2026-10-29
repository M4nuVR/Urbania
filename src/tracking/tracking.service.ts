import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Assignment } from '../assignments/assignment.entity';
import type { AuthenticatedPrincipal } from '../common/report-access';
import { NotificationType } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Report, ReportStatus } from '../reports/report.entity';
import { ChangeStatusDto } from './dto/change-status.dto';
import { assertTransitionAllowed, STATUS_LABEL } from './status-transitions';
import { Tracking } from './tracking.entity';

@Injectable()
export class TrackingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Tracking)
    private readonly tracking: Repository<Tracking>,
    private readonly notifications: NotificationsService,
  ) {}

  // Único punto de cambio de estado. En una transacción: valida, actualiza
  // Report.status condicionado al estado leído, registra Tracking y notifica al
  // ciudadano dueño. Si algo falla, se revierte todo.
  async changeStatus(
    reportId: string,
    dto: ChangeStatusDto,
    actor: AuthenticatedPrincipal,
  ) {
    const observation = dto.observation || null;

    return this.dataSource.transaction(async (manager) => {
      const report = await manager.findOne(Report, {
        where: { id: reportId },
        select: { id: true, title: true, status: true, citizenId: true },
      });
      if (!report) throw new NotFoundException('Reporte no encontrado');

      const assignment = await manager.findOne(Assignment, {
        where: { reportId },
        select: { id: true, authorityId: true },
      });

      assertTransitionAllowed({
        current: report.status,
        next: dto.newStatus,
        actor,
        assignedAuthorityId: assignment?.authorityId ?? null,
        observation,
      });

      // Control de concurrencia: si otra petición ya cambió el estado,
      // esta actualización no afecta filas y se rechaza.
      const { affected } = await manager.update(
        Report,
        { id: reportId, status: report.status },
        { status: dto.newStatus },
      );
      if (!affected) {
        throw new ConflictException(
          'El estado del reporte cambió mientras se procesaba la solicitud',
        );
      }

      const entry = await manager.save(
        manager.create(Tracking, {
          id: randomUUID(),
          reportId,
          previousStatus: report.status,
          newStatus: dto.newStatus,
          changedBy: actor.id,
          observation,
        }),
      );

      await this.notifications.create(
        {
          userId: report.citizenId,
          reportId,
          type: NotificationType.STATUS_CHANGED,
          message: `Tu reporte "${report.title}" pasó a ${STATUS_LABEL[dto.newStatus]}.`,
        },
        manager,
      );

      return entry;
    });
  }

  findByReport(reportId: string) {
    return this.tracking.find({
      where: { reportId },
      order: { createdAt: 'ASC' },
      relations: { user: true },
      select: {
        id: true,
        reportId: true,
        previousStatus: true,
        newStatus: true,
        changedBy: true,
        observation: true,
        createdAt: true,
        user: { id: true, name: true, role: true },
      },
    });
  }

  // Para Persona 2: llamar dentro de la transacción que crea el reporte para
  // registrar la entrada inicial (previousStatus nulo).
  // Ejemplo: await trackingService.recordInitial(manager, report.id, citizenId);
  recordInitial(manager: EntityManager, reportId: string, citizenId: string) {
    return manager.save(
      manager.create(Tracking, {
        id: randomUUID(),
        reportId,
        previousStatus: null,
        newStatus: ReportStatus.REPORTED,
        changedBy: citizenId,
      }),
    );
  }
}

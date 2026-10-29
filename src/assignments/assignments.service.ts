import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { NotificationType } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Report, ReportStatus } from '../reports/report.entity';
import { Role, User } from '../users/user.entity';
import { Assignment } from './assignment.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Assignment)
    private readonly assignments: Repository<Assignment>,
    private readonly notifications: NotificationsService,
  ) {}

  // MVP: el administrador asigna una sola vez; la reasignación queda como mejora.
  // Asignar no cambia el estado del reporte: la transición REPORTED → UNDER_REVIEW
  // se hace después por PATCH /reports/:id/status.
  async assign(reportId: string, dto: CreateAssignmentDto, adminId: string) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const report = await manager.findOne(Report, {
          where: { id: reportId },
          select: { id: true, title: true, status: true, citizenId: true },
        });
        if (!report) throw new NotFoundException('Reporte no encontrado');
        if (report.status === ReportStatus.RESOLVED) {
          throw new ConflictException(
            'No se puede asignar un reporte resuelto',
          );
        }
        if (await manager.existsBy(Assignment, { reportId })) {
          throw new ConflictException(
            'El reporte ya tiene una autoridad asignada',
          );
        }

        const authority = await manager.findOne(User, {
          where: { id: dto.authorityId },
          select: { id: true, role: true },
        });
        if (!authority) {
          throw new NotFoundException('Usuario responsable no encontrado');
        }
        if (authority.role !== Role.AUTHORITY) {
          throw new UnprocessableEntityException(
            'El usuario responsable debe tener rol AUTHORITY',
          );
        }

        const assignment = await manager.save(
          manager.create(Assignment, {
            id: randomUUID(),
            reportId,
            authorityId: dto.authorityId,
            assignedBy: adminId,
          }),
        );

        await this.notifications.create(
          {
            userId: dto.authorityId,
            reportId,
            type: NotificationType.ASSIGNED,
            message: `Se te asignó el reporte "${report.title}".`,
          },
          manager,
        );
        await this.notifications.create(
          {
            userId: report.citizenId,
            reportId,
            type: NotificationType.ASSIGNED,
            message: `Tu reporte "${report.title}" fue asignado a una autoridad.`,
          },
          manager,
        );

        return manager.findOneOrFail(Assignment, {
          where: { id: assignment.id },
          relations: { authority: true },
        });
      });
    } catch (error) {
      // Dos asignaciones simultáneas: la segunda choca con el índice único reportId.
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        throw new ConflictException(
          'El reporte ya tiene una autoridad asignada',
        );
      }
      throw error;
    }
  }

  async findByReport(reportId: string) {
    const assignment = await this.assignments.findOne({
      where: { reportId },
      relations: { authority: true },
    });
    if (!assignment) {
      throw new NotFoundException('El reporte no tiene autoridad asignada');
    }
    return assignment;
  }
}

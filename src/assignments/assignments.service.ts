import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import {
  NotificationType,
  ReportStatus,
  Role,
} from '../generated/prisma/enums.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';

const authoritySelect = { id: true, name: true, email: true } as const;

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // MVP: el administrador asigna una sola vez; la reasignación queda como mejora.
  // Asignar no cambia el estado del reporte: la transición REPORTED → UNDER_REVIEW
  // se hace después por PATCH /reports/:id/status.
  async assign(reportId: string, dto: CreateAssignmentDto, adminId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const report = await tx.report.findUnique({
          where: { id: reportId },
          select: {
            title: true,
            status: true,
            citizenId: true,
            assignment: { select: { id: true } },
          },
        });
        if (!report) throw new NotFoundException('Reporte no encontrado');
        if (report.status === ReportStatus.RESOLVED) {
          throw new ConflictException(
            'No se puede asignar un reporte resuelto',
          );
        }
        if (report.assignment) {
          throw new ConflictException(
            'El reporte ya tiene una autoridad asignada',
          );
        }

        const authority = await tx.user.findUnique({
          where: { id: dto.authorityId },
          select: { role: true },
        });
        if (!authority) {
          throw new NotFoundException('Usuario responsable no encontrado');
        }
        if (authority.role !== Role.AUTHORITY) {
          throw new UnprocessableEntityException(
            'El usuario responsable debe tener rol AUTHORITY',
          );
        }

        const assignment = await tx.assignment.create({
          data: {
            reportId,
            authorityId: dto.authorityId,
            assignedBy: adminId,
          },
          include: { authority: { select: authoritySelect } },
        });

        await this.notifications.create(
          {
            userId: dto.authorityId,
            reportId,
            type: NotificationType.ASSIGNED,
            message: `Se te asignó el reporte "${report.title}".`,
          },
          tx,
        );
        await this.notifications.create(
          {
            userId: report.citizenId,
            reportId,
            type: NotificationType.ASSIGNED,
            message: `Tu reporte "${report.title}" fue asignado a una autoridad.`,
          },
          tx,
        );

        return assignment;
      });
    } catch (error) {
      // Dos asignaciones simultáneas: la segunda choca con el índice único report_id.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'El reporte ya tiene una autoridad asignada',
        );
      }
      throw error;
    }
  }

  async findByReport(reportId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { reportId },
      include: { authority: { select: authoritySelect } },
    });
    if (!assignment) {
      throw new NotFoundException('El reporte no tiene autoridad asignada');
    }
    return assignment;
  }
}

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { hasRole } from '../common/auth/roles';
import type { AuthenticatedPrincipal } from '../common/report-access';
import { ReportStatus } from '../reports/report.entity';
import { Role } from '../users/user.entity';

// Única transición permitida desde cada estado. RESOLVED es final en el MVP.
export const NEXT_STATUS: Record<ReportStatus, ReportStatus | null> = {
  [ReportStatus.REPORTED]: ReportStatus.UNDER_REVIEW,
  [ReportStatus.UNDER_REVIEW]: ReportStatus.IN_PROGRESS,
  [ReportStatus.IN_PROGRESS]: ReportStatus.RESOLVED,
  [ReportStatus.RESOLVED]: null,
};

export const STATUS_LABEL: Record<ReportStatus, string> = {
  [ReportStatus.REPORTED]: 'Reportado',
  [ReportStatus.UNDER_REVIEW]: 'En revisión',
  [ReportStatus.IN_PROGRESS]: 'En atención',
  [ReportStatus.RESOLVED]: 'Resuelto',
};

export interface TransitionInput {
  current: ReportStatus;
  next: ReportStatus;
  actor: AuthenticatedPrincipal;
  assignedAuthorityId: string | null;
  observation?: string | null;
}

// Lanza la excepción HTTP correspondiente si el cambio no está permitido.
export function assertTransitionAllowed(input: TransitionInput): void {
  const { current, next, actor, assignedAuthorityId } = input;
  const isAdmin = hasRole(actor, Role.ADMIN);

  if (!isAdmin && !hasRole(actor, Role.AUTHORITY)) {
    throw new ForbiddenException(
      'Solo la autoridad asignada o un administrador pueden cambiar el estado',
    );
  }
  if (!isAdmin && assignedAuthorityId !== actor.id) {
    throw new ForbiddenException(
      'No eres la autoridad asignada a este reporte',
    );
  }
  if (current === ReportStatus.RESOLVED) {
    throw new ConflictException('Un reporte resuelto no admite más cambios');
  }
  if (next === current) {
    throw new ConflictException(`El reporte ya está en estado ${current}`);
  }
  if (NEXT_STATUS[current] !== next) {
    throw new ConflictException(
      `Transición no permitida: ${current} → ${next}. Siguiente estado válido: ${NEXT_STATUS[current]}`,
    );
  }
  if (next === ReportStatus.IN_PROGRESS && !assignedAuthorityId) {
    throw new ConflictException(
      'El reporte debe tener una autoridad asignada antes de iniciar la atención',
    );
  }
  if (next === ReportStatus.RESOLVED && !input.observation?.trim()) {
    throw new BadRequestException(
      'La observación de solución es obligatoria para resolver el reporte',
    );
  }
}

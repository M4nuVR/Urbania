import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { hasRole } from '../common/auth/roles';
import type { AuthenticatedPrincipal } from '../common/report-access';
import { ReportStatus } from '../reports/report.entity';
import { UserRole } from '../users/user.entity';

// Transiciones permitidas desde cada estado. RESOLVED y REJECTED son finales.
export const ALLOWED_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> =
  {
    [ReportStatus.REPORTED]: [ReportStatus.IN_PROGRESS, ReportStatus.REJECTED],
    [ReportStatus.IN_PROGRESS]: [ReportStatus.RESOLVED, ReportStatus.REJECTED],
    [ReportStatus.RESOLVED]: [],
    [ReportStatus.REJECTED]: [],
  };

export const FINAL_STATUSES: readonly ReportStatus[] = [
  ReportStatus.RESOLVED,
  ReportStatus.REJECTED,
];

export const STATUS_LABEL: Record<ReportStatus, string> = {
  [ReportStatus.REPORTED]: 'Reportado',
  [ReportStatus.IN_PROGRESS]: 'En atención',
  [ReportStatus.RESOLVED]: 'Resuelto',
  [ReportStatus.REJECTED]: 'Rechazado',
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
  const isAdmin = hasRole(actor, UserRole.ADMIN);

  if (!isAdmin && !hasRole(actor, UserRole.AUTHORITY)) {
    throw new ForbiddenException(
      'Solo la autoridad asignada o un administrador pueden cambiar el estado',
    );
  }
  if (!isAdmin && assignedAuthorityId !== actor.id) {
    throw new ForbiddenException(
      'No eres la autoridad asignada a este reporte',
    );
  }
  if (FINAL_STATUSES.includes(current)) {
    throw new ConflictException(
      `Un reporte ${STATUS_LABEL[current].toLowerCase()} no admite más cambios`,
    );
  }
  if (next === current) {
    throw new ConflictException(`El reporte ya está en estado ${current}`);
  }
  if (!ALLOWED_TRANSITIONS[current].includes(next)) {
    throw new ConflictException(
      `Transición no permitida: ${current} → ${next}. Estados válidos: ${ALLOWED_TRANSITIONS[current].join(', ')}`,
    );
  }
  if (next === ReportStatus.IN_PROGRESS && !assignedAuthorityId) {
    throw new ConflictException(
      'El reporte debe tener una autoridad asignada antes de iniciar la atención',
    );
  }
  if (FINAL_STATUSES.includes(next) && !input.observation?.trim()) {
    throw new BadRequestException(
      'La observación es obligatoria para resolver o rechazar el reporte',
    );
  }
}

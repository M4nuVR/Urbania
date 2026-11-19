import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ReportStatus } from '../reports/report.entity';
import { UserRole } from '../users/user.entity';
import { assertTransitionAllowed } from './status-transitions';

const ADMIN = { id: 'admin-1', roles: [UserRole.ADMIN] };
const AUTHORITY = { id: 'auth-1', roles: [UserRole.AUTHORITY] };
const OTHER_AUTHORITY = { id: 'auth-2', roles: [UserRole.AUTHORITY] };
const CITIZEN = { id: 'cit-1', roles: [UserRole.CITIZEN] };

const { REPORTED, IN_PROGRESS, RESOLVED, REJECTED } = ReportStatus;

describe('assertTransitionAllowed', () => {
  it('permite el flujo completo a la autoridad asignada', () => {
    const base = { actor: AUTHORITY, assignedAuthorityId: AUTHORITY.id };
    expect(() =>
      assertTransitionAllowed({ ...base, current: REPORTED, next: IN_PROGRESS }),
    ).not.toThrow();
    expect(() =>
      assertTransitionAllowed({
        ...base,
        current: IN_PROGRESS,
        next: RESOLVED,
        observation: 'Reparado',
      }),
    ).not.toThrow();
  });

  it('permite al administrador rechazar sin asignación, con observación', () => {
    expect(() =>
      assertTransitionAllowed({
        current: REPORTED,
        next: REJECTED,
        actor: ADMIN,
        assignedAuthorityId: null,
        observation: 'Reporte duplicado',
      }),
    ).not.toThrow();
  });

  it('exige asignación para iniciar la atención, incluso al administrador', () => {
    expect(() =>
      assertTransitionAllowed({
        current: REPORTED,
        next: IN_PROGRESS,
        actor: ADMIN,
        assignedAuthorityId: null,
      }),
    ).toThrow(ConflictException);
  });

  it('rechaza al ciudadano', () => {
    expect(() =>
      assertTransitionAllowed({
        current: REPORTED,
        next: IN_PROGRESS,
        actor: CITIZEN,
        assignedAuthorityId: AUTHORITY.id,
      }),
    ).toThrow(ForbiddenException);
  });

  it('rechaza a una autoridad ajena', () => {
    expect(() =>
      assertTransitionAllowed({
        current: REPORTED,
        next: IN_PROGRESS,
        actor: OTHER_AUTHORITY,
        assignedAuthorityId: AUTHORITY.id,
      }),
    ).toThrow(ForbiddenException);
  });

  it('rechaza saltos, retrocesos, mismo estado y cambios sobre estados finales', () => {
    const base = {
      actor: ADMIN,
      assignedAuthorityId: AUTHORITY.id,
      observation: 'x',
    };
    expect(() =>
      assertTransitionAllowed({ ...base, current: REPORTED, next: RESOLVED }),
    ).toThrow(ConflictException);
    expect(() =>
      assertTransitionAllowed({ ...base, current: IN_PROGRESS, next: IN_PROGRESS }),
    ).toThrow(ConflictException);
    expect(() =>
      assertTransitionAllowed({ ...base, current: IN_PROGRESS, next: REPORTED }),
    ).toThrow(ConflictException);
    expect(() =>
      assertTransitionAllowed({ ...base, current: RESOLVED, next: REJECTED }),
    ).toThrow(ConflictException);
    expect(() =>
      assertTransitionAllowed({ ...base, current: REJECTED, next: IN_PROGRESS }),
    ).toThrow(ConflictException);
  });

  it('exige observación no vacía para resolver o rechazar', () => {
    const base = {
      current: IN_PROGRESS,
      actor: AUTHORITY,
      assignedAuthorityId: AUTHORITY.id,
    };
    expect(() => assertTransitionAllowed({ ...base, next: RESOLVED })).toThrow(
      BadRequestException,
    );
    expect(() =>
      assertTransitionAllowed({ ...base, next: REJECTED, observation: '   ' }),
    ).toThrow(BadRequestException);
  });
});

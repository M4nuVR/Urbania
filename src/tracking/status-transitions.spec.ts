import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ReportStatus } from '../reports/report.entity';
import { Role } from '../users/user.entity';
import { assertTransitionAllowed } from './status-transitions';

const ADMIN = { id: 'admin-1', roles: [Role.ADMIN] };
const AUTHORITY = { id: 'auth-1', roles: [Role.AUTHORITY] };
const OTHER_AUTHORITY = { id: 'auth-2', roles: [Role.AUTHORITY] };
const CITIZEN = { id: 'cit-1', roles: [Role.CITIZEN] };

const { REPORTED, UNDER_REVIEW, IN_PROGRESS, RESOLVED } = ReportStatus;

describe('assertTransitionAllowed', () => {
  it('permite el flujo completo a la autoridad asignada', () => {
    const base = { actor: AUTHORITY, assignedAuthorityId: AUTHORITY.id };
    expect(() =>
      assertTransitionAllowed({ ...base, current: REPORTED, next: UNDER_REVIEW }),
    ).not.toThrow();
    expect(() =>
      assertTransitionAllowed({
        ...base,
        current: UNDER_REVIEW,
        next: IN_PROGRESS,
      }),
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

  it('permite al administrador revisar sin asignación', () => {
    expect(() =>
      assertTransitionAllowed({
        current: REPORTED,
        next: UNDER_REVIEW,
        actor: ADMIN,
        assignedAuthorityId: null,
      }),
    ).not.toThrow();
  });

  it('exige asignación para iniciar la atención, incluso al administrador', () => {
    expect(() =>
      assertTransitionAllowed({
        current: UNDER_REVIEW,
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
        next: UNDER_REVIEW,
        actor: CITIZEN,
        assignedAuthorityId: AUTHORITY.id,
      }),
    ).toThrow(ForbiddenException);
  });

  it('rechaza a una autoridad ajena', () => {
    expect(() =>
      assertTransitionAllowed({
        current: REPORTED,
        next: UNDER_REVIEW,
        actor: OTHER_AUTHORITY,
        assignedAuthorityId: AUTHORITY.id,
      }),
    ).toThrow(ForbiddenException);
  });

  it('rechaza saltos, mismo estado y cambios sobre un reporte resuelto', () => {
    const base = { actor: ADMIN, assignedAuthorityId: AUTHORITY.id };
    expect(() =>
      assertTransitionAllowed({
        ...base,
        current: REPORTED,
        next: RESOLVED,
        observation: 'x',
      }),
    ).toThrow(ConflictException);
    expect(() =>
      assertTransitionAllowed({ ...base, current: IN_PROGRESS, next: IN_PROGRESS }),
    ).toThrow(ConflictException);
    expect(() =>
      assertTransitionAllowed({ ...base, current: IN_PROGRESS, next: UNDER_REVIEW }),
    ).toThrow(ConflictException);
    expect(() =>
      assertTransitionAllowed({ ...base, current: RESOLVED, next: REPORTED }),
    ).toThrow(ConflictException);
  });

  it('exige observación no vacía para resolver', () => {
    const base = {
      current: IN_PROGRESS,
      next: RESOLVED,
      actor: AUTHORITY,
      assignedAuthorityId: AUTHORITY.id,
    };
    expect(() => assertTransitionAllowed(base)).toThrow(BadRequestException);
    expect(() =>
      assertTransitionAllowed({ ...base, observation: '   ' }),
    ).toThrow(BadRequestException);
  });
});

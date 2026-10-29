import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/user.entity';
import type { AuthenticatedPrincipal } from '../report-access';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export function hasRole(principal: AuthenticatedPrincipal, role: UserRole) {
  return principal.roles.includes(role);
}

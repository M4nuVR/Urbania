import { SetMetadata } from '@nestjs/common';
import { Role } from '../../users/user.entity';
import type { AuthenticatedPrincipal } from '../report-access';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export function hasRole(principal: AuthenticatedPrincipal, role: Role) {
  return principal.roles.includes(role);
}

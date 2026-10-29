import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../users/user.entity';
import { ROLES_KEY } from './roles';

interface RequestWithUser {
  user?: { role?: string; roles?: string[] };
}

// Se ejecuta después del AuthGuard. Sin @Roles() la ruta solo exige autenticación.
// Acepta `role` o `roles` en request.user, igual que CurrentPrincipal.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const user = context.switchToHttp().getRequest<RequestWithUser>().user;
    const roles = user?.roles ?? (user?.role ? [user.role] : []);
    if (!required.some((role) => roles.includes(role))) {
      throw new ForbiddenException('No tienes permiso para esta acción');
    }
    return true;
  }
}

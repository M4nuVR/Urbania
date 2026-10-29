import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthUser } from './auth-user.js';

interface RequestUser {
  id?: string;
  sub?: string;
  role?: AuthUser['role'];
}

// Lee el usuario autenticado del request (lo coloca el guard de autenticación).
// assignedBy y changedBy salen de aquí, nunca del cuerpo de la petición.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const id = request.user?.id ?? request.user?.sub;
    const role = request.user?.role;

    if (!id || !role) {
      throw new UnauthorizedException('Se requiere autenticación');
    }
    return { id, role };
  },
);

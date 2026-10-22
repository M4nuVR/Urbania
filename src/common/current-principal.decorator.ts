import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedPrincipal } from './report-access';

interface AuthenticatedRequest {
  user?: {
    id?: string;
    sub?: string;
    role?: string;
    roles?: string[];
  };
}

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipal => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const id = user?.id ?? user?.sub;

    if (!id) {
      throw new UnauthorizedException('Se requiere autenticación');
    }

    return {
      id,
      roles: user?.roles ?? (user?.role ? [user.role] : []),
    };
  },
);

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';

interface AuthRequest {
  user?: { id?: string; sub?: string; role?: string };
  headers: Record<string, string | string[] | undefined>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// TEMPORAL hasta integrar la autenticación JWT de Persona 1.
//
// - Si otro guard/middleware (JWT de Persona 1) ya dejó `request.user`, se respeta.
// - Si DEV_AUTH=true (y no es producción), acepta la cabecera `x-user-id` y carga
//   el rol desde la base de datos, nunca desde la petición. Solo para probar en local.
// - En cualquier otro caso responde 401.
//
// Para integrar: Persona 1 reemplaza el cuerpo de este guard por su verificación JWT,
// o los controladores cambian AuthGuard por el guard que exporte su módulo.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (request.user?.id ?? request.user?.sub) return true;

    const devAuth =
      this.config.get<string>('DEV_AUTH') === 'true' &&
      this.config.get<string>('NODE_ENV') !== 'production';
    const header = request.headers['x-user-id'];
    const userId = Array.isArray(header) ? header[0] : header;

    if (devAuth && userId && UUID_RE.test(userId)) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });
      if (user) {
        request.user = user;
        return true;
      }
    }

    throw new UnauthorizedException('Se requiere autenticación');
  }
}

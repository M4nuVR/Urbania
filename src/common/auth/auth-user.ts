import type { Role } from '../../generated/prisma/enums.js';

// Contrato con Persona 1: su guard JWT debe dejar en `request.user`
// al menos el id del usuario (`id` o `sub`) y su rol.
export interface AuthUser {
  id: string;
  role: Role;
}

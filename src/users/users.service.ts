import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { QueryFailedError, Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

export interface NewUser {
  email: string;
  fullName: string;
  passwordHash: string;
  role?: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async create(input: NewUser): Promise<User> {
    const email = normalizeEmail(input.email);
    if (await this.users.existsBy({ email })) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }

    const user = this.users.create({
      id: randomUUID(),
      email,
      fullName: input.fullName.trim(),
      passwordHash: input.passwordHash,
      role: input.role ?? UserRole.CITIZEN,
    });

    try {
      const saved = await this.users.save(user);
      const { passwordHash: _passwordHash, ...publicUser } = saved;
      return publicUser as User;
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }
      throw error;
    }
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  // Incluye passwordHash, que por defecto no se selecciona
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: normalizeEmail(email) })
      .getOne();
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const usersService = {
    create: jest.fn(),
    findByEmailWithPassword: jest.fn(),
    findById: jest.fn(),
  };
  const jwtService = { signAsync: jest.fn().mockResolvedValue('token') };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
    );
  });

  it('stores a hash instead of the plain password on register', async () => {
    usersService.create.mockImplementation((input) =>
      Promise.resolve({ id: 'user-id', role: UserRole.CITIZEN, ...input }),
    );

    await service.register({
      email: 'ana@example.org',
      fullName: 'Ana Perez',
      password: 'contrasena-segura',
    });

    const { passwordHash } = usersService.create.mock.calls[0][0];
    expect(passwordHash).not.toBe('contrasena-segura');
    expect(await bcrypt.compare('contrasena-segura', passwordHash)).toBe(true);
  });

  it('signs the token with the user id and role', async () => {
    const user = {
      id: 'user-id',
      role: UserRole.ADMIN,
      passwordHash: await bcrypt.hash('contrasena-segura', 4),
    } as User;
    usersService.findByEmailWithPassword.mockResolvedValue(user);

    const result = await service.login({
      email: 'ana@example.org',
      password: 'contrasena-segura',
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-id',
      role: UserRole.ADMIN,
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('rejects unknown emails and wrong passwords the same way', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);
    await expect(
      service.login({ email: 'nadie@example.org', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    usersService.findByEmailWithPassword.mockResolvedValue({
      passwordHash: await bcrypt.hash('otra', 4),
    } as User);
    await expect(
      service.login({ email: 'ana@example.org', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt-payload';

const BCRYPT_ROUNDS = 10;

export interface AuthResult {
  accessToken: string;
  user: User;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterDto): Promise<AuthResult> {
    const user = await this.usersService.create({
      email: input.email,
      fullName: input.fullName,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    });
    return this.issueToken(user);
  }

  async login(input: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmailWithPassword(input.email);
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return this.issueToken(publicUser as User);
  }

  async me(userId: string): Promise<User> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  private async issueToken(user: User): Promise<AuthResult> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return { accessToken: await this.jwtService.signAsync(payload), user };
  }
}

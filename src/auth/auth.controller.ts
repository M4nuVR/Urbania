import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentPrincipal } from '../common/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/report-access';
import { User } from '../users/user.entity';
import { AuthResult, AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar un ciudadano' })
  @ApiCreatedResponse({ description: 'Usuario creado y token emitido' })
  @ApiConflictResponse({ description: 'El correo ya esta registrado' })
  register(@Body() input: RegisterDto): Promise<AuthResult> {
    return this.authService.register(input);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesion y obtener un token JWT' })
  @ApiOkResponse({ description: 'Token emitido' })
  @ApiUnauthorizedResponse({ description: 'Credenciales incorrectas' })
  login(@Body() input: LoginDto): Promise<AuthResult> {
    return this.authService.login(input);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar el usuario autenticado' })
  @ApiOkResponse({ type: User })
  me(@CurrentPrincipal() principal: AuthenticatedPrincipal): Promise<User> {
    return this.authService.me(principal.id);
  }
}

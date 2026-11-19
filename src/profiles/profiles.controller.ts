import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentPrincipal } from '../common/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/report-access';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

// El usuario siempre sale del token, nunca del cuerpo ni de la ruta.
@ApiTags('profiles')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido o expirado' })
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Consultar mi perfil' })
  @ApiOkResponse({
    type: ProfileResponseDto,
    description: '{ "profile": null } si aún no existe',
  })
  findMine(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<ProfileResponseDto> {
    return this.profilesService.findMine(principal.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Crear o actualizar mi perfil' })
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiBadRequestResponse({
    description:
      'Cuerpo vacío, URL inválida, texto demasiado largo o campos no permitidos',
  })
  updateMine(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profilesService.updateMine(principal.id, input);
  }
}

import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentPrincipal } from '../common/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/report-access';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@ApiTags('categories')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido o expirado' })
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una categoría (ADMIN)' })
  @ApiCreatedResponse({ type: Category })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiForbiddenResponse({ description: 'Solo administradores' })
  @ApiConflictResponse({ description: 'Slug duplicado' })
  create(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: CreateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.create(principal, input);
  }

  @Get()
  @ApiOperation({ summary: 'Listar las categorías activas' })
  @ApiOkResponse({ type: Category, isArray: true })
  findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar una categoría, incluso si está inactiva',
  })
  @ApiOkResponse({ type: Category })
  @ApiBadRequestResponse({ description: 'UUID inválido' })
  @ApiNotFoundResponse({ description: 'Categoría no encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Category> {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar o reactivar una categoría (ADMIN)' })
  @ApiOkResponse({ type: Category })
  @ApiBadRequestResponse({
    description: 'UUID o datos inválidos; cuerpo vacío',
  })
  @ApiForbiddenResponse({ description: 'Solo administradores' })
  @ApiNotFoundResponse({ description: 'Categoría no encontrada' })
  @ApiConflictResponse({ description: 'Slug duplicado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.update(id, principal, input);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una categoría sin borrarla (ADMIN)' })
  @ApiOkResponse({ type: Category })
  @ApiBadRequestResponse({ description: 'UUID inválido' })
  @ApiForbiddenResponse({ description: 'Solo administradores' })
  @ApiNotFoundResponse({ description: 'Categoría no encontrada' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<Category> {
    return this.categoriesService.remove(id, principal);
  }
}

import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { QueryFailedError, Repository } from 'typeorm';
import type { AuthenticatedPrincipal } from '../common/report-access';
import { UserRole } from '../users/user.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
  ) {}

  async create(
    principal: AuthenticatedPrincipal,
    input: CreateCategoryDto,
  ): Promise<Category> {
    this.assertAdmin(principal);
    const slug = input.slug.trim().toLowerCase();
    await this.assertSlugAvailable(slug);

    return this.saveCategory(
      this.categories.create({
        id: randomUUID(),
        name: input.name.trim(),
        slug,
        description: input.description?.trim() ?? null,
        isActive: input.isActive ?? true,
      }),
    );
  }

  findAll(): Promise<Category[]> {
    return this.categories.find({
      where: { isActive: true },
      order: { name: 'ASC', id: 'ASC' },
    });
  }

  // También devuelve categorías inactivas para conservar consultas históricas.
  async findOne(id: string): Promise<Category> {
    const category = await this.categories.findOneBy({ id });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return category;
  }

  // Contrato para la futura integración con ReportsModule.
  async findActiveById(id: string): Promise<Category> {
    const category = await this.findOne(id);
    if (!category.isActive) {
      throw new BadRequestException('La categoría está inactiva');
    }
    return category;
  }

  async update(
    id: string,
    principal: AuthenticatedPrincipal,
    input: UpdateCategoryDto,
  ): Promise<Category> {
    this.assertAdmin(principal);
    if (
      [input.name, input.slug, input.description, input.isActive].every(
        (value) => value === undefined,
      )
    ) {
      throw new BadRequestException('Debes enviar al menos un campo');
    }

    const category = await this.findOne(id);
    if (input.slug !== undefined) {
      const slug = input.slug.trim().toLowerCase();
      await this.assertSlugAvailable(slug, id);
      category.slug = slug;
    }
    if (input.name !== undefined) category.name = input.name.trim();
    if (input.description !== undefined) {
      category.description = input.description?.trim() ?? null;
    }
    if (input.isActive !== undefined) category.isActive = input.isActive;

    return this.saveCategory(category);
  }

  async remove(
    id: string,
    principal: AuthenticatedPrincipal,
  ): Promise<Category> {
    this.assertAdmin(principal);
    const category = await this.findOne(id);
    category.isActive = false;
    return this.saveCategory(category);
  }

  private assertAdmin(principal: AuthenticatedPrincipal): void {
    if (!principal.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException(
        'Solo un administrador puede gestionar categorías',
      );
    }
  }

  private async assertSlugAvailable(
    slug: string,
    currentId?: string,
  ): Promise<void> {
    // Las categorías desactivadas también conservan su slug.
    const existing = await this.categories.findOneBy({ slug });
    if (existing && existing.id !== currentId) {
      throw new ConflictException('Ya existe una categoría con ese slug');
    }
  }

  private async saveCategory(category: Category): Promise<Category> {
    try {
      return await this.categories.save(category);
    } catch (error) {
      // La restricción de PostgreSQL cubre dos solicitudes simultáneas.
      if (error instanceof QueryFailedError) {
        const driver = error.driverError as {
          code?: string;
          constraint?: string;
          message?: string;
        };
        const postgresConflict =
          driver.code === '23505' && driver.constraint === 'uq_categories_slug';
        const sqljsConflict = driver.message?.includes(
          'UNIQUE constraint failed: categories.slug',
        );
        if (postgresConflict || sqljsConflict) {
          throw new ConflictException('Ya existe una categoría con ese slug');
        }
      }
      throw error;
    }
  }
}

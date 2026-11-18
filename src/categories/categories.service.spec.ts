import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';

describe('CategoriesService', () => {
  const admin = { id: 'admin-id', roles: ['ADMIN'] };
  const citizen = { id: 'citizen-id', roles: ['CITIZEN'] };
  const repository = {
    create: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  };
  const existing: Category = {
    id: 'category-id',
    name: 'Vías',
    slug: 'vias',
    description: 'Calles y vías',
    isActive: true,
    createdAt: new Date('2026-11-18T00:00:00Z'),
  };
  let service: CategoriesService;

  beforeEach(() => {
    jest.resetAllMocks();
    repository.create.mockImplementation((value) => value);
    repository.save.mockImplementation((value) => Promise.resolve(value));
    repository.findOneBy.mockResolvedValue(null);
    service = new CategoriesService(
      repository as unknown as Repository<Category>,
    );
  });

  it('normalizes names and slugs and supplies server-owned defaults', async () => {
    const category = await service.create(admin, {
      name: ' Vías ',
      slug: ' VIAS ',
    });
    expect(category).toMatchObject({
      name: 'Vías',
      slug: 'vias',
      description: null,
      isActive: true,
    });
    expect(category.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('blocks all citizen writes before querying the database', async () => {
    await expect(
      service.create(citizen, { name: 'Vías', slug: 'vias' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.update(existing.id, citizen, { name: 'Otro' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove(existing.id, citizen)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.findOneBy).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('reserves slugs even after deactivation', async () => {
    repository.findOneBy.mockResolvedValue({ ...existing, isActive: false });
    await expect(
      service.create(admin, { name: 'Otra', slug: 'vias' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it.each(['create', 'update'] as const)(
    'maps a concurrent PostgreSQL slug conflict to 409 on %s',
    async (operation) => {
      if (operation === 'update') {
        repository.findOneBy
          .mockResolvedValueOnce({ ...existing })
          .mockResolvedValueOnce(null);
      }
      repository.save.mockRejectedValue(
        new QueryFailedError(
          'SAVE',
          [],
          Object.assign(new Error('duplicate key'), {
            code: '23505',
            constraint: 'uq_categories_slug',
          }),
        ),
      );
      const result =
        operation === 'create'
          ? service.create(admin, { name: 'Vías', slug: 'vias' })
          : service.update(existing.id, admin, { slug: 'otro' });
      await expect(result).rejects.toBeInstanceOf(ConflictException);
    },
  );

  it('does not disguise unrelated database failures as slug conflicts', async () => {
    const failure = new QueryFailedError(
      'SAVE',
      [],
      Object.assign(new Error('unrelated unique constraint'), {
        code: '23505',
        constraint: 'different_constraint',
      }),
    );
    repository.save.mockRejectedValue(failure);
    await expect(
      service.create(admin, { name: 'Vías', slug: 'vias' }),
    ).rejects.toBe(failure);
  });

  it('rejects missing and inactive categories when assigning them to reports', async () => {
    await expect(service.findActiveById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    repository.findOneBy.mockResolvedValue({ ...existing, isActive: false });
    await expect(service.findActiveById(existing.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.findOne(existing.id)).resolves.toMatchObject({
      isActive: false,
    });
    repository.findOneBy.mockResolvedValue({ ...existing });
    await expect(service.findActiveById(existing.id)).resolves.toMatchObject({
      isActive: true,
    });
  });

  it('rejects empty updates without saving', async () => {
    await expect(service.update(existing.id, admin, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('preserves the current slug and omitted fields, and accepts explicit null description', async () => {
    repository.findOneBy.mockResolvedValue({ ...existing });
    await expect(
      service.update(existing.id, admin, { slug: 'vias', description: null }),
    ).resolves.toMatchObject({
      name: 'Vías',
      slug: 'vias',
      description: null,
      isActive: true,
    });
  });

  it('rejects updating to another category slug', async () => {
    repository.findOneBy
      .mockResolvedValueOnce({ ...existing })
      .mockResolvedValueOnce({ ...existing, id: 'another-id', slug: 'otro' });
    await expect(
      service.update(existing.id, admin, { slug: 'otro' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('deactivates the same record without deleting it', async () => {
    repository.findOneBy.mockResolvedValue({ ...existing });
    await expect(service.remove(existing.id, admin)).resolves.toMatchObject({
      id: existing.id,
      isActive: false,
    });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existing.id,
        isActive: false,
      }),
    );
  });
});

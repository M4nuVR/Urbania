import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { CategoriesService } from '../categories/categories.service';
import { Category } from '../categories/entities/category.entity';
import { Report, ReportStatus } from './report.entity';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const owner = { id: 'owner-id', roles: ['CITIZEN'] };
  const admin = { id: 'admin-id', roles: ['ADMIN'] };
  const roads = {
    id: 'roads-id',
    name: 'Vías',
    slug: 'vias',
    isActive: true,
  } as Category;
  const lighting = { ...roads, id: 'lighting-id', slug: 'alumbrado' };
  const report = {
    id: 'report-id',
    ownerId: owner.id,
    title: 'Bache',
    description: 'Bache profundo',
    categoryId: roads.id,
    category: roads,
    status: ReportStatus.REPORTED,
  } as Report;
  const repository = {
    create: jest.fn((value) => value),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn((value) => Promise.resolve(value)),
  };
  const categories = { findActiveById: jest.fn() };
  let service: ReportsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findOne.mockResolvedValue(report);
    categories.findActiveById.mockImplementation((id: string) =>
      Promise.resolve([roads, lighting].find((c) => c.id === id)),
    );
    service = new ReportsService(
      repository as unknown as Repository<Report>,
      categories as unknown as CategoriesService,
    );
  });

  it('assigns the owner from the token, validates the category and starts as REPORTED', async () => {
    const created = await service.create(owner, {
      title: '  Bache  ',
      description: 'Bache profundo',
      categoryId: roads.id,
    });

    expect(categories.findActiveById).toHaveBeenCalledWith(roads.id);
    expect(created).toMatchObject({
      ownerId: owner.id,
      title: 'Bache',
      categoryId: roads.id,
      category: roads,
      status: ReportStatus.REPORTED,
    });
  });

  it('does not create a report with a missing or inactive category', async () => {
    categories.findActiveById.mockRejectedValueOnce(new NotFoundException());
    await expect(
      service.create(owner, {
        title: 'Bache',
        description: 'Bache profundo',
        categoryId: 'missing-id',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    categories.findActiveById.mockRejectedValueOnce(new BadRequestException());
    await expect(
      service.create(owner, {
        title: 'Bache',
        description: 'Bache profundo',
        categoryId: 'inactive-id',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('filters by owner for citizens but not for admins, combined with category', async () => {
    await service.findAll(owner, { categoryId: roads.id });
    expect(repository.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { ownerId: owner.id, categoryId: roads.id },
        relations: { category: true },
      }),
    );

    await service.findAll(admin, { status: ReportStatus.REPORTED });
    expect(repository.find).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { status: ReportStatus.REPORTED } }),
    );
  });

  it('only lets the owner edit while the report is REPORTED', async () => {
    await expect(
      service.update(report.id, admin, { title: 'Otro' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    repository.findOne.mockResolvedValue({
      ...report,
      status: ReportStatus.IN_PROGRESS,
    });
    await expect(
      service.update(report.id, owner, { categoryId: lighting.id }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(categories.findActiveById).not.toHaveBeenCalled();
  });

  it('replaces both the id and the loaded relation when the category changes', async () => {
    const updated = await service.update(report.id, owner, {
      categoryId: lighting.id,
    });
    expect(categories.findActiveById).toHaveBeenCalledWith(lighting.id);
    expect(updated).toMatchObject({
      categoryId: lighting.id,
      category: lighting,
      title: report.title,
    });
  });

  it('keeps a category that was deactivated later when editing other fields', async () => {
    repository.findOne.mockResolvedValue({
      ...report,
      category: { ...roads, isActive: false },
    });
    const updated = await service.update(report.id, owner, {
      title: 'Bache grande',
      categoryId: roads.id,
    });
    expect(categories.findActiveById).not.toHaveBeenCalled();
    expect(updated).toMatchObject({
      title: 'Bache grande',
      categoryId: roads.id,
    });
  });

  it('rejects an empty update', async () => {
    await expect(service.update(report.id, owner, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('restricts status changes to admins and valid transitions', async () => {
    await expect(
      service.updateStatus(report.id, owner, {
        status: ReportStatus.IN_PROGRESS,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.updateStatus(report.id, admin, {
        status: ReportStatus.RESOLVED,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.updateStatus(report.id, admin, {
        status: ReportStatus.IN_PROGRESS,
      }),
    ).resolves.toMatchObject({ status: ReportStatus.IN_PROGRESS });
  });
});

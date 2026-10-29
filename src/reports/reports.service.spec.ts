import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Report, ReportCategory, ReportStatus } from './report.entity';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const owner = { id: 'owner-id', roles: ['CITIZEN'] };
  const admin = { id: 'admin-id', roles: ['ADMIN'] };
  const report = {
    id: 'report-id',
    ownerId: owner.id,
    title: 'Bache',
    description: 'Bache profundo',
    category: ReportCategory.ROADS,
    status: ReportStatus.REPORTED,
  } as Report;
  const repository = {
    create: jest.fn((value) => value),
    find: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn((value) => Promise.resolve(value)),
  };
  let service: ReportsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findOneBy.mockResolvedValue(report);
    service = new ReportsService(repository as unknown as Repository<Report>);
  });

  it('assigns the owner from the token and starts as REPORTED', async () => {
    const created = await service.create(owner, {
      title: '  Bache  ',
      description: 'Bache profundo',
      category: ReportCategory.ROADS,
    });

    expect(created).toMatchObject({
      ownerId: owner.id,
      title: 'Bache',
      status: ReportStatus.REPORTED,
    });
  });

  it('filters by owner for citizens but not for admins', async () => {
    await service.findAll(owner, {});
    expect(repository.find).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { ownerId: owner.id } }),
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

    repository.findOneBy.mockResolvedValue({
      ...report,
      status: ReportStatus.IN_PROGRESS,
    });
    await expect(
      service.update(report.id, owner, { title: 'Otro' }),
    ).rejects.toBeInstanceOf(ConflictException);
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

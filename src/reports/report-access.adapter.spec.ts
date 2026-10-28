import { ReportAccessAdapter } from './report-access.adapter';
import { Report, ReportStatus } from './report.entity';
import { ReportsService } from './reports.service';

describe('ReportAccessAdapter', () => {
  const report = {
    id: 'report-id',
    ownerId: 'owner-id',
    status: ReportStatus.REPORTED,
  };
  const reportsService = { findById: jest.fn() };
  let adapter: ReportAccessAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new ReportAccessAdapter(
      reportsService as unknown as ReportsService,
    );
  });

  it('exposes only the fields required by the access contract', async () => {
    reportsService.findById.mockResolvedValue({
      ...report,
      title: 'Bache',
    } as Report);

    await expect(adapter.findById(report.id)).resolves.toEqual(report);
  });

  it('returns null when the report does not exist', async () => {
    reportsService.findById.mockResolvedValue(null);

    await expect(adapter.findById('missing')).resolves.toBeNull();
  });

  it('lets the owner and admins read, but only the owner modify', async () => {
    const owner = { id: 'owner-id', roles: ['CITIZEN'] };
    const admin = { id: 'admin-id', roles: ['ADMIN'] };
    const stranger = { id: 'other-id', roles: ['CITIZEN'] };

    await expect(adapter.canRead(owner, report)).resolves.toBe(true);
    await expect(adapter.canRead(admin, report)).resolves.toBe(true);
    await expect(adapter.canRead(stranger, report)).resolves.toBe(false);

    await expect(adapter.canModify(owner, report)).resolves.toBe(true);
    await expect(adapter.canModify(admin, report)).resolves.toBe(false);
  });
});

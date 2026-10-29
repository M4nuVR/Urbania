import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TrackingService } from './tracking.service.js';

const REPORT_ID = '11111111-1111-4111-8111-111111111111';
const AUTHORITY = { id: 'auth-1', role: Role.AUTHORITY };

function setup(report: unknown, updatedCount = 1) {
  const tx = {
    report: {
      findUnique: vi.fn().mockResolvedValue(report),
      updateMany: vi.fn().mockResolvedValue({ count: updatedCount }),
    },
    tracking: { create: vi.fn().mockResolvedValue({ id: 't-1' }) },
    notification: { create: vi.fn().mockResolvedValue({ id: 'n-1' }) },
  };
  const prisma = {
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  } as unknown as PrismaService;
  const service = new TrackingService(prisma, new NotificationsService(prisma));
  return { service, tx };
}

const reportInProgress = {
  title: 'Luminaria dañada',
  status: 'IN_PROGRESS',
  citizenId: 'cit-1',
  assignment: { authorityId: AUTHORITY.id },
};

describe('TrackingService.changeStatus', () => {
  it('actualiza condicionado al estado leído, guarda una entrada y notifica al dueño', async () => {
    const { service, tx } = setup(reportInProgress);

    await service.changeStatus(
      REPORT_ID,
      { newStatus: 'RESOLVED', observation: 'Reparada' },
      AUTHORITY,
    );

    expect(tx.report.updateMany).toHaveBeenCalledWith({
      where: { id: REPORT_ID, status: 'IN_PROGRESS' },
      data: { status: 'RESOLVED' },
    });
    expect(tx.tracking.create).toHaveBeenCalledTimes(1);
    expect(tx.tracking.create).toHaveBeenCalledWith({
      data: {
        reportId: REPORT_ID,
        previousStatus: 'IN_PROGRESS',
        newStatus: 'RESOLVED',
        changedBy: AUTHORITY.id,
        observation: 'Reparada',
      },
    });
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
    expect(tx.notification.create.mock.calls[0][0].data).toMatchObject({
      userId: 'cit-1',
      type: 'STATUS_CHANGED',
    });
  });

  it('responde 404 si el reporte no existe', async () => {
    const { service } = setup(null);
    await expect(
      service.changeStatus(REPORT_ID, { newStatus: 'UNDER_REVIEW' }, AUTHORITY),
    ).rejects.toThrow(NotFoundException);
  });

  it('rechaza con 409 si otra petición cambió el estado antes (concurrencia)', async () => {
    const { service, tx } = setup(reportInProgress, 0);
    await expect(
      service.changeStatus(
        REPORT_ID,
        { newStatus: 'RESOLVED', observation: 'Reparada' },
        AUTHORITY,
      ),
    ).rejects.toThrow(ConflictException);
    expect(tx.tracking.create).not.toHaveBeenCalled();
    expect(tx.notification.create).not.toHaveBeenCalled();
  });

  it('no escribe nada si la transición es inválida', async () => {
    const { service, tx } = setup(reportInProgress);
    await expect(
      service.changeStatus(REPORT_ID, { newStatus: 'RESOLVED' }, AUTHORITY),
    ).rejects.toThrow();
    expect(tx.report.updateMany).not.toHaveBeenCalled();
    expect(tx.tracking.create).not.toHaveBeenCalled();
  });
});

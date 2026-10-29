import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Assignment } from '../assignments/assignment.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Report, ReportStatus } from '../reports/report.entity';
import { UserRole } from '../users/user.entity';
import { Tracking } from './tracking.entity';
import { TrackingService } from './tracking.service';

const REPORT_ID = '11111111-1111-4111-8111-111111111111';
const AUTHORITY = { id: 'auth-1', roles: [UserRole.AUTHORITY] };

function setup(report: unknown, affected = 1) {
  const manager = {
    findOne: jest.fn((entity: unknown) =>
      Promise.resolve(
        entity === Assignment ? { authorityId: AUTHORITY.id } : report,
      ),
    ),
    update: jest.fn().mockResolvedValue({ affected }),
    create: jest.fn((_entity: unknown, value: unknown) => value),
    save: jest.fn((value) => Promise.resolve(value)),
  };
  const dataSource = {
    transaction: jest.fn((fn: (m: typeof manager) => unknown) => fn(manager)),
  };
  const notifications = { create: jest.fn().mockResolvedValue({}) };
  const service = new TrackingService(
    dataSource as unknown as DataSource,
    {} as Repository<Tracking>,
    notifications as unknown as NotificationsService,
  );
  return { service, manager, notifications };
}

const reportInProgress = {
  id: REPORT_ID,
  title: 'Luminaria dañada',
  status: ReportStatus.IN_PROGRESS,
  ownerId: 'cit-1',
};

const resolve = (service: TrackingService, observation?: string) =>
  service.changeStatus(
    REPORT_ID,
    { newStatus: ReportStatus.RESOLVED, observation },
    AUTHORITY,
  );

describe('TrackingService.changeStatus', () => {
  it('actualiza condicionado al estado leído, guarda una entrada y notifica al dueño', async () => {
    const { service, manager, notifications } = setup(reportInProgress);

    await resolve(service, 'Reparada');

    expect(manager.update).toHaveBeenCalledWith(
      Report,
      { id: REPORT_ID, status: ReportStatus.IN_PROGRESS },
      { status: ReportStatus.RESOLVED },
    );
    expect(manager.create).toHaveBeenCalledWith(
      Tracking,
      expect.objectContaining({
        reportId: REPORT_ID,
        previousStatus: ReportStatus.IN_PROGRESS,
        newStatus: ReportStatus.RESOLVED,
        changedBy: AUTHORITY.id,
        observation: 'Reparada',
      }),
    );
    expect(manager.save).toHaveBeenCalledTimes(1);
    expect(notifications.create).toHaveBeenCalledTimes(1);
    expect(notifications.create.mock.calls[0][0]).toMatchObject({
      userId: 'cit-1',
      type: 'STATUS_CHANGED',
    });
  });

  it('responde 404 si el reporte no existe', async () => {
    const { service } = setup(null);
    await expect(
      service.changeStatus(
        REPORT_ID,
        { newStatus: ReportStatus.IN_PROGRESS },
        AUTHORITY,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rechaza con 409 si otra petición cambió el estado antes (concurrencia)', async () => {
    const { service, manager, notifications } = setup(reportInProgress, 0);
    await expect(resolve(service, 'Reparada')).rejects.toThrow(
      ConflictException,
    );
    expect(manager.save).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('no escribe nada si la transición es inválida', async () => {
    const { service, manager } = setup(reportInProgress);
    await expect(resolve(service)).rejects.toThrow();
    expect(manager.update).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });
});

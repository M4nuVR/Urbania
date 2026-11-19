import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import { Report } from '../reports/report.entity';
import { User } from '../users/user.entity';
import { Assignment } from './assignment.entity';
import { AssignmentsService } from './assignments.service';

const REPORT_ID = '11111111-1111-4111-8111-111111111111';
const AUTHORITY_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_ID = '33333333-3333-4333-8333-333333333333';

const openReport = {
  id: REPORT_ID,
  title: 'Hueco en la vía',
  status: 'REPORTED',
  ownerId: 'cit-1',
};

function setup(
  report: unknown,
  authority: unknown,
  options: { alreadyAssigned?: boolean; saveError?: Error } = {},
) {
  const manager = {
    findOne: jest.fn((entity: unknown) =>
      Promise.resolve(entity === Report ? report : authority),
    ),
    existsBy: jest.fn().mockResolvedValue(options.alreadyAssigned ?? false),
    create: jest.fn((_entity: unknown, value: unknown) => value),
    save: options.saveError
      ? jest.fn().mockRejectedValue(options.saveError)
      : jest.fn((value) => Promise.resolve(value)),
    findOneOrFail: jest.fn().mockResolvedValue({ id: 'a-1' }),
  };
  const dataSource = {
    transaction: jest.fn((fn: (m: typeof manager) => unknown) => fn(manager)),
  };
  const notifications = { create: jest.fn().mockResolvedValue({}) };
  const service = new AssignmentsService(
    dataSource as unknown as DataSource,
    {} as Repository<Assignment>,
    notifications as unknown as NotificationsService,
  );
  return { service, manager, notifications };
}

const assign = (service: AssignmentsService) =>
  service.assign(REPORT_ID, { authorityId: AUTHORITY_ID }, ADMIN_ID);

describe('AssignmentsService.assign', () => {
  it('asigna y notifica a la autoridad y al ciudadano', async () => {
    const { service, manager, notifications } = setup(openReport, {
      role: 'AUTHORITY',
    });
    await assign(service);
    expect(manager.create).toHaveBeenCalledWith(
      Assignment,
      expect.objectContaining({
        reportId: REPORT_ID,
        authorityId: AUTHORITY_ID,
        assignedBy: ADMIN_ID,
      }),
    );
    expect(notifications.create).toHaveBeenCalledTimes(2);
    expect(notifications.create.mock.calls[0][1]).toBe(manager);
  });

  it('rechaza un reporte inexistente', async () => {
    const { service } = setup(null, { role: 'AUTHORITY' });
    await expect(assign(service)).rejects.toThrow(NotFoundException);
  });

  it('rechaza un usuario inexistente', async () => {
    const { service, manager } = setup(openReport, null);
    await expect(assign(service)).rejects.toThrow(NotFoundException);
    expect(manager.findOne).toHaveBeenCalledWith(User, expect.anything());
  });

  it('rechaza un usuario que no es autoridad', async () => {
    const { service, manager } = setup(openReport, { role: 'CITIZEN' });
    await expect(assign(service)).rejects.toThrow(UnprocessableEntityException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('rechaza reportes resueltos y asignaciones duplicadas', async () => {
    const resolved = setup(
      { ...openReport, status: 'RESOLVED' },
      { role: 'AUTHORITY' },
    );
    await expect(assign(resolved.service)).rejects.toThrow(ConflictException);

    const assigned = setup(
      openReport,
      { role: 'AUTHORITY' },
      { alreadyAssigned: true },
    );
    await expect(assign(assigned.service)).rejects.toThrow(ConflictException);
  });

  it('convierte el choque del índice único (23505) en 409', async () => {
    const uniqueViolation = new QueryFailedError('INSERT', [], {
      code: '23505',
    } as unknown as Error);
    const { service } = setup(
      openReport,
      { role: 'AUTHORITY' },
      { saveError: uniqueViolation },
    );
    await expect(assign(service)).rejects.toThrow(ConflictException);
  });
});

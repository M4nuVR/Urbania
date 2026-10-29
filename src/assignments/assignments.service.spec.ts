import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AssignmentsService } from './assignments.service.js';

const REPORT_ID = '11111111-1111-4111-8111-111111111111';
const AUTHORITY_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_ID = '33333333-3333-4333-8333-333333333333';

const openReport = {
  title: 'Hueco en la vía',
  status: 'REPORTED',
  citizenId: 'cit-1',
  assignment: null,
};

function setup(report: unknown, authority: unknown, createError?: Error) {
  const tx = {
    report: { findUnique: vi.fn().mockResolvedValue(report) },
    user: { findUnique: vi.fn().mockResolvedValue(authority) },
    assignment: {
      create: createError
        ? vi.fn().mockRejectedValue(createError)
        : vi.fn().mockResolvedValue({ id: 'a-1' }),
    },
    notification: { create: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  } as unknown as PrismaService;
  const service = new AssignmentsService(
    prisma,
    new NotificationsService(prisma),
  );
  return { service, tx };
}

const assign = (service: AssignmentsService) =>
  service.assign(REPORT_ID, { authorityId: AUTHORITY_ID }, ADMIN_ID);

describe('AssignmentsService.assign', () => {
  it('asigna y notifica a la autoridad y al ciudadano', async () => {
    const { service, tx } = setup(openReport, { role: 'AUTHORITY' });
    await assign(service);
    expect(tx.assignment.create.mock.calls[0][0].data).toEqual({
      reportId: REPORT_ID,
      authorityId: AUTHORITY_ID,
      assignedBy: ADMIN_ID,
    });
    expect(tx.notification.create).toHaveBeenCalledTimes(2);
  });

  it('rechaza un reporte inexistente', async () => {
    const { service } = setup(null, { role: 'AUTHORITY' });
    await expect(assign(service)).rejects.toThrow(NotFoundException);
  });

  it('rechaza un usuario inexistente', async () => {
    const { service } = setup(openReport, null);
    await expect(assign(service)).rejects.toThrow(NotFoundException);
  });

  it('rechaza un usuario que no es autoridad', async () => {
    const { service, tx } = setup(openReport, { role: 'CITIZEN' });
    await expect(assign(service)).rejects.toThrow(UnprocessableEntityException);
    expect(tx.assignment.create).not.toHaveBeenCalled();
  });

  it('rechaza reportes resueltos y asignaciones duplicadas', async () => {
    const resolved = setup(
      { ...openReport, status: 'RESOLVED' },
      { role: 'AUTHORITY' },
    );
    await expect(assign(resolved.service)).rejects.toThrow(ConflictException);

    const assigned = setup(
      { ...openReport, assignment: { id: 'a-0' } },
      { role: 'AUTHORITY' },
    );
    await expect(assign(assigned.service)).rejects.toThrow(ConflictException);
  });

  it('convierte el choque del índice único (P2002) en 409', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint',
      {
        code: 'P2002',
        clientVersion: 'test',
      },
    );
    const { service } = setup(openReport, { role: 'AUTHORITY' }, p2002);
    await expect(assign(service)).rejects.toThrow(ConflictException);
  });
});

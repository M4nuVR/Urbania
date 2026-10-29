import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';

const NOTIFICATION_ID = '44444444-4444-4444-8444-444444444444';

function setup(found: unknown) {
  const prisma = {
    notification: {
      findFirst: vi.fn().mockResolvedValue(found),
      update: vi
        .fn()
        .mockImplementation(({ data }) => ({ ...(found as object), ...data })),
    },
  };
  return {
    service: new NotificationsService(prisma as unknown as PrismaService),
    prisma,
  };
}

describe('NotificationsService.markAsRead', () => {
  it('busca la notificación filtrando por el destinatario', async () => {
    const { service, prisma } = setup({ id: NOTIFICATION_ID, readAt: null });
    const result = await service.markAsRead(NOTIFICATION_ID, 'user-1');
    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: { id: NOTIFICATION_ID, userId: 'user-1' },
    });
    expect(result.readAt).toBeInstanceOf(Date);
  });

  it('responde 404 para una notificación ajena o inexistente', async () => {
    const { service, prisma } = setup(null);
    await expect(service.markAsRead(NOTIFICATION_ID, 'otro')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('es idempotente si ya estaba leída', async () => {
    const readAt = new Date('2026-10-01T00:00:00Z');
    const { service, prisma } = setup({ id: NOTIFICATION_ID, readAt });
    const result = await service.markAsRead(NOTIFICATION_ID, 'user-1');
    expect(result.readAt).toBe(readAt);
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });
});

import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';

const NOTIFICATION_ID = '44444444-4444-4444-8444-444444444444';

function setup(found: unknown) {
  const repository = {
    findOneBy: jest.fn().mockResolvedValue(found),
    save: jest.fn((value) => Promise.resolve(value)),
  };
  return {
    service: new NotificationsService(
      repository as unknown as Repository<Notification>,
    ),
    repository,
  };
}

describe('NotificationsService.markAsRead', () => {
  it('busca la notificación filtrando por el destinatario', async () => {
    const { service, repository } = setup({ id: NOTIFICATION_ID, readAt: null });
    const result = await service.markAsRead(NOTIFICATION_ID, 'user-1');
    expect(repository.findOneBy).toHaveBeenCalledWith({
      id: NOTIFICATION_ID,
      userId: 'user-1',
    });
    expect(result.readAt).toBeInstanceOf(Date);
  });

  it('responde 404 para una notificación ajena o inexistente', async () => {
    const { service, repository } = setup(null);
    await expect(service.markAsRead(NOTIFICATION_ID, 'otro')).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('es idempotente si ya estaba leída', async () => {
    const readAt = new Date('2026-10-01T00:00:00Z');
    const { service, repository } = setup({ id: NOTIFICATION_ID, readAt });
    const result = await service.markAsRead(NOTIFICATION_ID, 'user-1');
    expect(result.readAt).toBe(readAt);
    expect(repository.save).not.toHaveBeenCalled();
  });
});

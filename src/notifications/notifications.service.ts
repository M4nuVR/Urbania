import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { EntityManager, FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { Notification, NotificationType } from './notification.entity';

export interface CreateNotificationInput {
  userId: string;
  reportId: string;
  type: NotificationType;
  message: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}

  // Recibe `manager` para crearse dentro de la transacción de quien la llama
  // (asignación o cambio de estado): si algo falla, la notificación se revierte.
  create(input: CreateNotificationInput, manager?: EntityManager) {
    const repository = manager
      ? manager.getRepository(Notification)
      : this.notifications;
    return repository.save(
      repository.create({ id: randomUUID(), ...input, readAt: null }),
    );
  }

  async findMine(userId: string, query: ListNotificationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: FindOptionsWhere<Notification> = {
      userId,
      ...(query.unreadOnly ? { readAt: IsNull() } : {}),
    };

    const [[data, total], unread] = await Promise.all([
      this.notifications.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.notifications.count({ where: { userId, readAt: IsNull() } }),
    ]);

    return { data, meta: { page, limit, total, unread } };
  }

  // Idempotente: si ya estaba leída conserva la fecha original.
  // Una notificación ajena responde 404 para no revelar que existe.
  async markAsRead(id: string, userId: string) {
    const notification = await this.notifications.findOneBy({ id, userId });
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }
    if (notification.readAt) return notification;

    notification.readAt = new Date();
    return this.notifications.save(notification);
  }
}

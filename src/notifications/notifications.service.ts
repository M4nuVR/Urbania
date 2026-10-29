import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import type { NotificationType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';

export interface CreateNotificationInput {
  userId: string;
  reportId: string;
  type: NotificationType;
  message: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // Recibe `tx` para crearse dentro de la transacción de quien la llama
  // (asignación o cambio de estado): si algo falla, la notificación se revierte.
  create(
    data: CreateNotificationInput,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.notification.create({ data });
  }

  async findMine(userId: string, query: ListNotificationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

    const [data, total, unread] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return { data, meta: { page, limit, total, unread } };
  }

  // Idempotente: si ya estaba leída conserva la fecha original.
  // Una notificación ajena responde 404 para no revelar que existe.
  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }
    if (notification.readAt) return notification;

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
}

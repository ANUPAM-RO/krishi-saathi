import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';

export interface NotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  scheduledAt?: Date;
}

const DISPATCH_BATCH = 500;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private dispatching = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  /** Creates in-app notifications and sends push for those already due. Returns the recipient count. */
  async notifyUsers(userIds: string[], input: NotificationInput): Promise<number> {
    if (!userIds.length) return 0;
    const unique = [...new Set(userIds)];
    for (let i = 0; i < unique.length; i += 1000) {
      await this.prisma.notification.createMany({
        data: unique.slice(i, i + 1000).map((userId) => ({
          userId,
          type: input.type,
          title: input.title,
          message: input.message,
          data: input.data as Prisma.InputJsonValue | undefined,
          scheduledAt: input.scheduledAt ?? new Date(),
        })),
      });
    }
    if (!input.scheduledAt || input.scheduledAt <= new Date()) void this.dispatchDue();
    return unique.length;
  }

  /** Sends push for every due, unsent notification. Safe to call often. */
  async dispatchDue(): Promise<void> {
    if (this.dispatching) return;
    this.dispatching = true;
    try {
      for (;;) {
        const due = await this.prisma.notification.findMany({
          where: { sentAt: null, scheduledAt: { lte: new Date() } },
          include: { user: { select: { isActive: true, deviceTokens: { select: { token: true } } } } },
          orderBy: { scheduledAt: 'asc' },
          take: DISPATCH_BATCH,
        });
        if (!due.length) break;

        await this.push.send(
          due
            .filter((n) => n.user.isActive)
            .flatMap((n) =>
              n.user.deviceTokens.map((d) => ({
                to: d.token,
                title: n.title,
                body: n.message,
                data: { notificationId: n.id, type: n.type, ...((n.data as object | null) ?? {}) },
              })),
            ),
        );
        await this.prisma.notification.updateMany({
          where: { id: { in: due.map((n) => n.id) } },
          data: { sentAt: new Date() },
        });
        if (due.length < DISPATCH_BATCH) break;
      }
    } catch (err) {
      this.logger.error('Notification dispatch failed', err as Error);
    } finally {
      this.dispatching = false;
    }
  }

  async list(userId: string, page: number, pageSize: number) {
    const visible: Prisma.NotificationWhereInput = { userId, scheduledAt: { lte: new Date() } };
    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: visible,
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, type: true, title: true, message: true, data: true, createdAt: true, readAt: true },
      }),
      this.prisma.notification.count({ where: visible }),
      this.unreadCount(userId),
    ]);
    return { items, unreadCount, total, page, pageSize };
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null, scheduledAt: { lte: new Date() } } });
  }

  async markRead(userId: string, id: string) {
    const n = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!n) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: n.readAt ?? new Date() },
      select: { id: true, type: true, title: true, message: true, data: true, createdAt: true, readAt: true },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }
}

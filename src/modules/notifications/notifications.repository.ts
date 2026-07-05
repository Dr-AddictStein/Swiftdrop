import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { DrizzleService } from '../../database/drizzle.service';
import { notifications } from '../../database/schema';

export type NotificationRecord = typeof notifications.$inferSelect;

export interface CreateNotificationData {
  companyId: string;
  recipientId: string;
  type: NotificationType;
  message: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  create(data: CreateNotificationData): Promise<NotificationRecord> {
    return this.drizzleService.db
      .insert(notifications)
      .values({
        companyId: data.companyId,
        recipientId: data.recipientId,
        type: data.type,
        message: data.message,
        metadata: data.metadata ?? null,
      })
      .returning()
      .then((rows) => rows[0]);
  }

  findByRecipient(recipientId: string): Promise<NotificationRecord[]> {
    return this.drizzleService.db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientId, recipientId))
      .orderBy(desc(notifications.createdAt));
  }

  markRead(
    id: string,
    recipientId: string,
  ): Promise<NotificationRecord | null> {
    return this.drizzleService.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientId, recipientId),
        ),
      )
      .returning()
      .then((rows) => rows[0] ?? null);
  }
}

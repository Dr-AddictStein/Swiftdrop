import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { RealtimeService } from '../realtime/realtime.service';
import {
  CreateNotificationData,
  NotificationRecord,
  NotificationsRepository,
} from './notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly realtimeService: RealtimeService,
  ) {}

  async create(data: CreateNotificationData): Promise<NotificationRecord> {
    const notification = await this.notificationsRepository.create(data);
    this.realtimeService.emitNotification(notification);
    return notification;
  }

  findMine(requester: AuthenticatedUser): Promise<NotificationRecord[]> {
    return this.notificationsRepository.findByRecipient(requester.id);
  }

  async markRead(
    id: string,
    requester: AuthenticatedUser,
  ): Promise<NotificationRecord> {
    if (requester.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins have a notification inbox');
    }

    const updated = await this.notificationsRepository.markRead(
      id,
      requester.id,
    );

    if (!updated) {
      throw new NotFoundException(`Notification with id '${id}' not found`);
    }

    return updated;
  }
}

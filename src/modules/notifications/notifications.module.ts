import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { NotificationsController } from './notifications.controller';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsRepository, NotificationsService, RolesGuard],
  exports: [NotificationsRepository, NotificationsService],
})
export class NotificationsModule {}

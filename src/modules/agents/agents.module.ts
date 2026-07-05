import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompaniesModule } from '../companies/companies.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ParcelsModule } from '../parcels/parcels.module';
import { UsersModule } from '../users/users.module';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';

@Module({
  imports: [UsersModule, CompaniesModule, ParcelsModule, NotificationsModule],
  controllers: [AgentsController],
  providers: [AgentsService, RolesGuard],
  exports: [AgentsService],
})
export class AgentsModule {}

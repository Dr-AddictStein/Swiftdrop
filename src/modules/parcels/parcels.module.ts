import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DeliveryEventsModule } from '../delivery-events/delivery-events.module';
import { UsersModule } from '../users/users.module';
import { ParcelsController } from './parcels.controller';
import { ParcelsRepository } from './parcels.repository';
import { ParcelsService } from './parcels.service';

@Module({
  imports: [UsersModule, DeliveryEventsModule],
  controllers: [ParcelsController],
  providers: [ParcelsRepository, ParcelsService, RolesGuard],
  exports: [ParcelsRepository, ParcelsService],
})
export class ParcelsModule {}

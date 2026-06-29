import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DeliveryEventsController } from './delivery-events.controller';
import { DeliveryEventsRepository } from './delivery-events.repository';
import { DeliveryEventsService } from './delivery-events.service';

@Module({
  controllers: [DeliveryEventsController],
  providers: [DeliveryEventsRepository, DeliveryEventsService, RolesGuard],
  exports: [DeliveryEventsService, DeliveryEventsRepository],
})
export class DeliveryEventsModule {}

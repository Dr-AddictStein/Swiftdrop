import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersModule } from '../users/users.module';
import { ParcelsController } from './parcels.controller';
import { ParcelsRepository } from './parcels.repository';
import { ParcelsService } from './parcels.service';

@Module({
  imports: [UsersModule],
  controllers: [ParcelsController],
  providers: [ParcelsRepository, ParcelsService, RolesGuard],
  exports: [ParcelsRepository, ParcelsService],
})
export class ParcelsModule {}

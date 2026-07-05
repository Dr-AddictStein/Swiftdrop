import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompaniesModule } from '../companies/companies.module';
import { UsersModule } from '../users/users.module';
import { PlatformController } from './platform.controller';
import { PlatformRepository } from './platform.repository';
import { PlatformService } from './platform.service';

@Module({
  imports: [CompaniesModule, UsersModule],
  controllers: [PlatformController],
  providers: [PlatformRepository, PlatformService, RolesGuard],
  exports: [PlatformService],
})
export class PlatformModule {}

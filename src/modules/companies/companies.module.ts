import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersModule } from '../users/users.module';
import { CompaniesController } from './companies.controller';
import { CompaniesRepository } from './companies.repository';
import { CompaniesService } from './companies.service';

@Module({
  imports: [UsersModule],
  controllers: [CompaniesController],
  providers: [CompaniesRepository, CompaniesService, RolesGuard],
  exports: [CompaniesRepository, CompaniesService],
})
export class CompaniesModule {}

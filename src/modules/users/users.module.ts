import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersRepository, UsersService, RolesGuard],
  exports: [UsersRepository, UsersService],
})
export class UsersModule {}

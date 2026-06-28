import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.findById(id, user);
  }

  @Patch(':id/availability')
  updateAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAvailabilityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateAvailability(id, dto, user);
  }
}

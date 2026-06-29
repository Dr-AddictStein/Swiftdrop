import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { DeliveryEventsService } from '../delivery-events/delivery-events.service';
import { AssignParcelDto } from './dto/assign-parcel.dto';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { ListParcelsQueryDto } from './dto/list-parcels-query.dto';
import { UpdateParcelStatusDto } from './dto/update-parcel-status.dto';
import { ParcelsService } from './parcels.service';

@Controller('parcels')
@UseGuards(RolesGuard)
export class ParcelsController {
  constructor(
    private readonly parcelsService: ParcelsService,
    private readonly deliveryEventsService: DeliveryEventsService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateParcelDto) {
    return this.parcelsService.create(dto);
  }

  @Get()
  findAll(
    @Query() query: ListParcelsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.parcelsService.findAll(query, user);
  }

  @Get(':id/history')
  getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryEventsService.getTimeline(id, user);
  }

  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.parcelsService.findById(id, user);
  }

  @Patch(':id/assign')
  @Roles(UserRole.ADMIN)
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignParcelDto) {
    return this.parcelsService.assign(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.DELIVERY_AGENT)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateParcelStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryEventsService.recordStatusChange(
      id,
      dto.status,
      user,
      dto.remarks,
    );
  }
}

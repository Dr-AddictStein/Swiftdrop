import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { DeliveryEventsService } from './delivery-events.service';
import { CreateDeliveryEventDto } from './dto/create-delivery-event.dto';

@Controller('delivery-events')
@UseGuards(RolesGuard)
export class DeliveryEventsController {
  constructor(private readonly deliveryEventsService: DeliveryEventsService) {}

  @Post()
  @Roles(UserRole.DELIVERY_AGENT)
  create(
    @Body() dto: CreateDeliveryEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryEventsService.createFromDto(dto, user);
  }

  @Get(':parcelId')
  findByParcelId(
    @Param('parcelId', ParseUUIDPipe) parcelId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryEventsService.getTimeline(parcelId, user);
  }
}

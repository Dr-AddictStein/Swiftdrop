import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ParcelStatus } from '../../common/enums/parcel-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { assertValidStatusTransition } from '../../common/state/parcel-status.transitions';
import { DrizzleService } from '../../database/drizzle.service';
import { deliveryEvents, parcels } from '../../database/schema';
import { CreateDeliveryEventDto } from './dto/create-delivery-event.dto';
import { DeliveryEventsRepository } from './delivery-events.repository';

@Injectable()
export class DeliveryEventsService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly deliveryEventsRepository: DeliveryEventsRepository,
  ) {}

  recordStatusChange(
    parcelId: string,
    status: ParcelStatus,
    requester: AuthenticatedUser,
    remarks?: string,
  ) {
    return this.applyStatusChange({ parcelId, status, remarks }, requester);
  }

  createFromDto(dto: CreateDeliveryEventDto, requester: AuthenticatedUser) {
    return this.applyStatusChange(
      {
        parcelId: dto.parcelId,
        status: dto.status,
        remarks: dto.remarks,
      },
      requester,
    );
  }

  async getTimeline(parcelId: string, requester: AuthenticatedUser) {
    const parcel = await this.findParcelOrThrow(parcelId);
    this.assertCanAccessParcel(parcel, requester);

    return this.deliveryEventsRepository.findByParcelId(parcelId);
  }

  private async applyStatusChange(
    input: {
      parcelId: string;
      status: ParcelStatus;
      remarks?: string;
    },
    requester: AuthenticatedUser,
  ) {
    const parcel = await this.findParcelOrThrow(input.parcelId);

    this.assertCanUpdateStatus(parcel, requester);
    assertValidStatusTransition(parcel.status, input.status);

    if (input.status === ParcelStatus.PICKED_UP && !parcel.assignedAgentId) {
      throw new BadRequestException(
        'Parcel must be assigned to a delivery agent before pickup',
      );
    }

    return this.drizzleService.db.transaction(async (tx) => {
      const [event] = await tx
        .insert(deliveryEvents)
        .values({
          parcelId: input.parcelId,
          status: input.status,
          remarks: input.remarks,
          createdBy: requester.id,
        })
        .returning();

      const [updatedParcel] = await tx
        .update(parcels)
        .set({ status: input.status })
        .where(eq(parcels.id, input.parcelId))
        .returning();

      return {
        parcel: updatedParcel,
        event,
      };
    });
  }

  private async findParcelOrThrow(parcelId: string) {
    const parcel = await this.drizzleService.db
      .select()
      .from(parcels)
      .where(eq(parcels.id, parcelId))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!parcel) {
      throw new NotFoundException(`Parcel with id '${parcelId}' not found`);
    }

    return parcel;
  }

  private assertCanAccessParcel(
    parcel: { assignedAgentId: string | null },
    requester: AuthenticatedUser,
  ): void {
    if (requester.role === UserRole.ADMIN) {
      return;
    }

    if (parcel.assignedAgentId === requester.id) {
      return;
    }

    throw new ForbiddenException('You can only access parcels assigned to you');
  }

  private assertCanUpdateStatus(
    parcel: { assignedAgentId: string | null },
    requester: AuthenticatedUser,
  ): void {
    if (requester.role !== UserRole.DELIVERY_AGENT) {
      throw new ForbiddenException(
        'Only delivery agents can update parcel status',
      );
    }

    if (parcel.assignedAgentId !== requester.id) {
      throw new ForbiddenException(
        'You can only update status for parcels assigned to you',
      );
    }
  }
}

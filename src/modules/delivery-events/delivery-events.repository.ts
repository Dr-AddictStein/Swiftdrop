import { Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { deliveryEvents } from '../../database/schema';

export type DeliveryEventRecord = typeof deliveryEvents.$inferSelect;

@Injectable()
export class DeliveryEventsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  findByParcelId(parcelId: string): Promise<DeliveryEventRecord[]> {
    return this.drizzleService.db
      .select()
      .from(deliveryEvents)
      .where(eq(deliveryEvents.parcelId, parcelId))
      .orderBy(asc(deliveryEvents.createdAt));
  }
}

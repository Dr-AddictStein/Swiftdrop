import { Injectable } from '@nestjs/common';
import { and, eq, ilike, SQL } from 'drizzle-orm';
import { ParcelStatus } from '../../common/enums/parcel-status.enum';
import { DrizzleService } from '../../database/drizzle.service';
import { parcels } from '../../database/schema';

export type ParcelRecord = typeof parcels.$inferSelect;

export interface ParcelFilters {
  status?: ParcelStatus;
  sender?: string;
  assignedAgentId?: string;
}

@Injectable()
export class ParcelsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  create(data: {
    trackingNumber: string;
    senderName: string;
    senderAddress: string;
    recipientName: string;
    recipientAddress: string;
  }): Promise<ParcelRecord> {
    return this.drizzleService.db
      .insert(parcels)
      .values({
        ...data,
        status: ParcelStatus.REGISTERED,
      })
      .returning()
      .then((rows) => rows[0]);
  }

  findById(id: string): Promise<ParcelRecord | null> {
    return this.drizzleService.db
      .select()
      .from(parcels)
      .where(eq(parcels.id, id))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  findAll(filters: ParcelFilters = {}): Promise<ParcelRecord[]> {
    const conditions = this.buildFilterConditions(filters);
    const baseQuery = this.drizzleService.db.select().from(parcels);

    if (conditions.length === 0) {
      return baseQuery.orderBy(parcels.createdAt);
    }

    return baseQuery.where(and(...conditions)).orderBy(parcels.createdAt);
  }

  assign(id: string, assignedAgentId: string): Promise<ParcelRecord | null> {
    return this.drizzleService.db
      .update(parcels)
      .set({ assignedAgentId })
      .where(eq(parcels.id, id))
      .returning()
      .then((rows) => rows[0] ?? null);
  }

  private buildFilterConditions(filters: ParcelFilters): SQL[] {
    const conditions: SQL[] = [];

    if (filters.status) {
      conditions.push(eq(parcels.status, filters.status));
    }

    if (filters.sender) {
      conditions.push(ilike(parcels.senderName, `%${filters.sender}%`));
    }

    if (filters.assignedAgentId) {
      conditions.push(eq(parcels.assignedAgentId, filters.assignedAgentId));
    }

    return conditions;
  }
}

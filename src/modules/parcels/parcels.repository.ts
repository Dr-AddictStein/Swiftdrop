import { Injectable } from '@nestjs/common';
import { and, eq, ilike, ne, sql, SQL } from 'drizzle-orm';
import { ParcelStatus } from '../../common/enums/parcel-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { DrizzleService } from '../../database/drizzle.service';
import { deliveryEvents, parcels } from '../../database/schema';

export type ParcelRecord = typeof parcels.$inferSelect;

export interface ParcelFilters {
  companyId?: string;
  status?: ParcelStatus;
  sender?: string;
  assignedAgentId?: string;
  retryQueued?: boolean;
}

@Injectable()
export class ParcelsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  create(data: {
    trackingNumber: string;
    companyId: string;
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

  findActiveByAgent(
    agentId: string,
    companyId: string,
  ): Promise<ParcelRecord[]> {
    return this.drizzleService.db
      .select()
      .from(parcels)
      .where(
        and(
          eq(parcels.assignedAgentId, agentId),
          eq(parcels.companyId, companyId),
          ne(parcels.status, ParcelStatus.DELIVERED),
        ),
      )
      .orderBy(parcels.createdAt);
  }

  async findLeastLoadedAvailableAgentId(
    companyId: string,
    excludeAgentId: string,
  ): Promise<string | null> {
    const result = await this.drizzleService.db.execute<{ id: string }>(sql`
      SELECT u.id AS "id"
      FROM users u
      LEFT JOIN parcels p
        ON p.assigned_agent_id = u.id
        AND p.status <> ${ParcelStatus.DELIVERED}
      WHERE u.company_id = ${companyId}
        AND u.role = ${UserRole.DELIVERY_AGENT}
        AND u.is_available = true
        AND u.id <> ${excludeAgentId}
      GROUP BY u.id, u.created_at
      ORDER BY COUNT(p.id) ASC, u.created_at ASC
      LIMIT 1
    `);

    const row = result.rows[0];
    return row ? String(row.id) : null;
  }

  assign(id: string, assignedAgentId: string): Promise<ParcelRecord | null> {
    return this.drizzleService.db
      .update(parcels)
      .set({ assignedAgentId })
      .where(eq(parcels.id, id))
      .returning()
      .then((rows) => rows[0] ?? null);
  }

  setRetryQueued(
    id: string,
    retryQueued: boolean,
  ): Promise<ParcelRecord | null> {
    return this.drizzleService.db
      .update(parcels)
      .set({ retryQueued })
      .where(eq(parcels.id, id))
      .returning()
      .then((rows) => rows[0] ?? null);
  }

  reassignParcel(
    id: string,
    toAgentId: string | null,
    actorId: string,
    remarks: string,
  ): Promise<ParcelRecord | null> {
    return this.drizzleService.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(parcels)
        .set({
          assignedAgentId: toAgentId,
          status: ParcelStatus.REGISTERED,
          retryQueued: false,
        })
        .where(eq(parcels.id, id))
        .returning();

      if (!updated) {
        return null;
      }

      await tx.insert(deliveryEvents).values({
        parcelId: id,
        status: ParcelStatus.REGISTERED,
        remarks,
        createdBy: actorId,
      });

      return updated;
    });
  }

  private buildFilterConditions(filters: ParcelFilters): SQL[] {
    const conditions: SQL[] = [];

    if (filters.companyId) {
      conditions.push(eq(parcels.companyId, filters.companyId));
    }

    if (filters.status) {
      conditions.push(eq(parcels.status, filters.status));
    }

    if (filters.sender) {
      conditions.push(ilike(parcels.senderName, `%${filters.sender}%`));
    }

    if (filters.assignedAgentId) {
      conditions.push(eq(parcels.assignedAgentId, filters.assignedAgentId));
    }

    if (filters.retryQueued !== undefined) {
      conditions.push(eq(parcels.retryQueued, filters.retryQueued));
    }

    return conditions;
  }
}

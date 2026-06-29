import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { UserRole } from '../../common/enums/user-role.enum';
import { DrizzleService } from '../../database/drizzle.service';

export interface AgentReportRow {
  agentId: string;
  agentName: string;
  agentEmail: string;
  totalDeliveries: number;
  failedAttempts: number;
  averagePickupToDeliverySeconds: number | null;
}

@Injectable()
export class ReportsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async getAgentSummaries(): Promise<AgentReportRow[]> {
    const result = await this.drizzleService.db.execute(sql`
      SELECT
        u.id AS "agentId",
        u.name AS "agentName",
        u.email AS "agentEmail",
        COUNT(p.id) FILTER (WHERE p.status = 'DELIVERED')::int AS "totalDeliveries",
        COUNT(p.id) FILTER (WHERE p.status = 'FAILED_ATTEMPT')::int AS "failedAttempts",
        AVG(
          EXTRACT(EPOCH FROM (delivered_event.created_at - picked_up_event.created_at))
        ) FILTER (
          WHERE delivered_event.created_at IS NOT NULL
            AND picked_up_event.created_at IS NOT NULL
        ) AS "averagePickupToDeliverySeconds"
      FROM users u
      LEFT JOIN parcels p ON p.assigned_agent_id = u.id
      LEFT JOIN LATERAL (
        SELECT MIN(de.created_at) AS created_at
        FROM delivery_events de
        WHERE de.parcel_id = p.id
          AND de.status = 'PICKED_UP'
      ) picked_up_event ON true
      LEFT JOIN LATERAL (
        SELECT MIN(de.created_at) AS created_at
        FROM delivery_events de
        WHERE de.parcel_id = p.id
          AND de.status = 'DELIVERED'
      ) delivered_event ON true
      WHERE u.role = ${UserRole.DELIVERY_AGENT}
      GROUP BY u.id, u.name, u.email
      ORDER BY u.name
    `);

    return result.rows.map((row) => ({
      agentId: String(row.agentId),
      agentName: String(row.agentName),
      agentEmail: String(row.agentEmail),
      totalDeliveries: Number(row.totalDeliveries ?? 0),
      failedAttempts: Number(row.failedAttempts ?? 0),
      averagePickupToDeliverySeconds:
        row.averagePickupToDeliverySeconds === null
          ? null
          : Number(row.averagePickupToDeliverySeconds),
    }));
  }
}

import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { UserRole } from '../../common/enums/user-role.enum';
import { DrizzleService } from '../../database/drizzle.service';

export interface PlatformCompanyRow {
  id: string;
  name: string;
  joinCode: string;
  ownerName: string | null;
  ownerEmail: string | null;
  agentCount: number;
  parcelCount: number;
  deliveredCount: number;
  createdAt: string;
}

export interface PlatformUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string | null;
  companyName: string | null;
  isAvailable: boolean;
  createdAt: string;
}

export interface PlatformParcelRow {
  id: string;
  trackingNumber: string;
  status: string;
  retryQueued: boolean;
  companyId: string;
  companyName: string | null;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  senderName: string;
  recipientName: string;
  createdAt: string;
}

export interface PlatformTotals {
  companies: number;
  admins: number;
  agents: number;
  parcels: number;
  parcelsByStatus: Record<string, number>;
}

@Injectable()
export class PlatformRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async getTotals(): Promise<PlatformTotals> {
    const [{ rows: companyRows }, { rows: userRows }, { rows: parcelRows }] =
      await Promise.all([
        this.drizzleService.db.execute<{ count: number }>(
          sql`SELECT COUNT(*)::int AS count FROM companies`,
        ),
        this.drizzleService.db.execute<{ role: string; count: number }>(
          sql`SELECT role, COUNT(*)::int AS count FROM users GROUP BY role`,
        ),
        this.drizzleService.db.execute<{ status: string; count: number }>(
          sql`SELECT status, COUNT(*)::int AS count FROM parcels GROUP BY status`,
        ),
      ]);

    const roleCounts = new Map(
      userRows.map((row) => [row.role, Number(row.count)]),
    );

    const parcelsByStatus: Record<string, number> = {};
    let parcels = 0;
    for (const row of parcelRows) {
      const count = Number(row.count);
      parcelsByStatus[row.status] = count;
      parcels += count;
    }

    return {
      companies: Number(companyRows[0]?.count ?? 0),
      admins: roleCounts.get(UserRole.ADMIN) ?? 0,
      agents: roleCounts.get(UserRole.DELIVERY_AGENT) ?? 0,
      parcels,
      parcelsByStatus,
    };
  }

  async getCompanies(): Promise<PlatformCompanyRow[]> {
    const result = await this.drizzleService.db.execute<{
      id: string;
      name: string;
      joinCode: string;
      ownerName: string | null;
      ownerEmail: string | null;
      agentCount: number;
      parcelCount: number;
      deliveredCount: number;
      createdAt: Date;
    }>(sql`
      SELECT
        c.id AS "id",
        c.name AS "name",
        c.join_code AS "joinCode",
        owner.name AS "ownerName",
        owner.email AS "ownerEmail",
        COUNT(DISTINCT agent.id) FILTER (
          WHERE agent.role = ${UserRole.DELIVERY_AGENT}
        )::int AS "agentCount",
        COUNT(DISTINCT p.id)::int AS "parcelCount",
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'DELIVERED')::int AS "deliveredCount",
        c.created_at AS "createdAt"
      FROM companies c
      LEFT JOIN users owner ON owner.id = c.owner_id
      LEFT JOIN users agent ON agent.company_id = c.id
      LEFT JOIN parcels p ON p.company_id = c.id
      GROUP BY c.id, c.name, c.join_code, owner.name, owner.email, c.created_at
      ORDER BY c.created_at
    `);

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      joinCode: row.joinCode,
      ownerName: row.ownerName,
      ownerEmail: row.ownerEmail,
      agentCount: Number(row.agentCount ?? 0),
      parcelCount: Number(row.parcelCount ?? 0),
      deliveredCount: Number(row.deliveredCount ?? 0),
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  }

  async getUsers(): Promise<PlatformUserRow[]> {
    const result = await this.drizzleService.db.execute<{
      id: string;
      name: string;
      email: string;
      role: string;
      companyId: string | null;
      companyName: string | null;
      isAvailable: boolean;
      createdAt: Date;
    }>(sql`
      SELECT
        u.id AS "id",
        u.name AS "name",
        u.email AS "email",
        u.role AS "role",
        u.company_id AS "companyId",
        c.name AS "companyName",
        u.is_available AS "isAvailable",
        u.created_at AS "createdAt"
      FROM users u
      LEFT JOIN companies c ON c.id = u.company_id
      ORDER BY c.name NULLS FIRST, u.created_at
    `);

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      companyId: row.companyId,
      companyName: row.companyName,
      isAvailable: Boolean(row.isAvailable),
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  }

  async getParcels(): Promise<PlatformParcelRow[]> {
    const result = await this.drizzleService.db.execute<{
      id: string;
      trackingNumber: string;
      status: string;
      retryQueued: boolean;
      companyId: string;
      companyName: string | null;
      assignedAgentId: string | null;
      assignedAgentName: string | null;
      senderName: string;
      recipientName: string;
      createdAt: Date;
    }>(sql`
      SELECT
        p.id AS "id",
        p.tracking_number AS "trackingNumber",
        p.status AS "status",
        p.retry_queued AS "retryQueued",
        p.company_id AS "companyId",
        c.name AS "companyName",
        p.assigned_agent_id AS "assignedAgentId",
        a.name AS "assignedAgentName",
        p.sender_name AS "senderName",
        p.recipient_name AS "recipientName",
        p.created_at AS "createdAt"
      FROM parcels p
      LEFT JOIN companies c ON c.id = p.company_id
      LEFT JOIN users a ON a.id = p.assigned_agent_id
      ORDER BY p.created_at DESC
    `);

    return result.rows.map((row) => ({
      id: row.id,
      trackingNumber: row.trackingNumber,
      status: row.status,
      retryQueued: Boolean(row.retryQueued),
      companyId: row.companyId,
      companyName: row.companyName,
      assignedAgentId: row.assignedAgentId,
      assignedAgentName: row.assignedAgentName,
      senderName: row.senderName,
      recipientName: row.recipientName,
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  }
}

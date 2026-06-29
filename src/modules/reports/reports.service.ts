import { Injectable } from '@nestjs/common';
import { AgentReportRow, ReportsRepository } from './reports.repository';

export interface AgentReportSummary {
  agentId: string;
  agentName: string;
  agentEmail: string;
  totalDeliveries: number;
  successRate: number;
  averagePickupToDeliveryMinutes: number | null;
}

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async getAgentSummaries(): Promise<AgentReportSummary[]> {
    const rows = await this.reportsRepository.getAgentSummaries();
    return rows.map((row) => this.toSummary(row));
  }

  toSummary(row: AgentReportRow): AgentReportSummary {
    const completedAttempts = row.totalDeliveries + row.failedAttempts;

    return {
      agentId: row.agentId,
      agentName: row.agentName,
      agentEmail: row.agentEmail,
      totalDeliveries: row.totalDeliveries,
      successRate:
        completedAttempts > 0
          ? Number(((row.totalDeliveries / completedAttempts) * 100).toFixed(2))
          : 0,
      averagePickupToDeliveryMinutes:
        row.averagePickupToDeliverySeconds === null
          ? null
          : Number((row.averagePickupToDeliverySeconds / 60).toFixed(2)),
    };
  }
}

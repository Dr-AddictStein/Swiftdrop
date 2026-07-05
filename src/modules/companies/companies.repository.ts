import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { companies } from '../../database/schema';

export type CompanyRecord = typeof companies.$inferSelect;

export interface CompanySummary {
  id: string;
  name: string;
  joinCode: string;
}

const companySummaryFields = {
  id: companies.id,
  name: companies.name,
  joinCode: companies.joinCode,
};

@Injectable()
export class CompaniesRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  findAllSummaries(): Promise<CompanySummary[]> {
    return this.drizzleService.db
      .select(companySummaryFields)
      .from(companies)
      .orderBy(companies.name);
  }

  findById(id: string): Promise<CompanyRecord | null> {
    return this.drizzleService.db
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  findByJoinCode(joinCode: string): Promise<CompanyRecord | null> {
    return this.drizzleService.db
      .select()
      .from(companies)
      .where(eq(companies.joinCode, joinCode))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }
}

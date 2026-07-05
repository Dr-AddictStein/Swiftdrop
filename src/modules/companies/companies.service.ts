import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { DrizzleService } from '../../database/drizzle.service';
import { companies, users } from '../../database/schema';
import { UsersRepository } from '../users/users.repository';
import {
  CompaniesRepository,
  CompanyRecord,
  CompanySummary,
} from './companies.repository';
import { generateJoinCode } from './utils/join-code.util';

export interface CreatedCompanyAdmin {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string | null;
}

@Injectable()
export class CompaniesService {
  constructor(
    private readonly companiesRepository: CompaniesRepository,
    private readonly usersRepository: UsersRepository,
    private readonly drizzleService: DrizzleService,
  ) {}

  findAll(): Promise<CompanySummary[]> {
    return this.companiesRepository.findAllSummaries();
  }

  async findMyCompany(requester: AuthenticatedUser): Promise<CompanyRecord> {
    if (!requester.companyId) {
      throw new NotFoundException('You are not associated with a company');
    }

    return this.getByIdOrThrow(requester.companyId);
  }

  async getByIdOrThrow(id: string): Promise<CompanyRecord> {
    const company = await this.companiesRepository.findById(id);

    if (!company) {
      throw new NotFoundException(`Company with id '${id}' not found`);
    }

    return company;
  }

  /**
   * Atomically provisions a new tenant: a company plus its owner admin. Used
   * both by public self-registration and by super-admin company creation.
   */
  async createCompanyWithAdmin(input: {
    companyName: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
  }): Promise<{ company: CompanyRecord; admin: CreatedCompanyAdmin }> {
    const existing = await this.usersRepository.findByEmail(input.adminEmail);

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.adminPassword, 10);

    return this.drizzleService.db.transaction(async (tx) => {
      const [company] = await tx
        .insert(companies)
        .values({ name: input.companyName, joinCode: generateJoinCode() })
        .returning();

      const [admin] = await tx
        .insert(users)
        .values({
          name: input.adminName,
          email: input.adminEmail,
          passwordHash,
          role: UserRole.ADMIN,
          companyId: company.id,
          isAvailable: true,
        })
        .returning();

      const [updatedCompany] = await tx
        .update(companies)
        .set({ ownerId: admin.id })
        .where(eq(companies.id, company.id))
        .returning();

      return {
        company: updatedCompany,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          companyId: admin.companyId,
        },
      };
    });
  }
}

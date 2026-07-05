import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/enums/user-role.enum';
import { CompaniesService } from '../companies/companies.service';
import { UsersRepository } from '../users/users.repository';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CreatePlatformAgentDto } from './dto/create-platform-agent.dto';
import { PlatformRepository } from './platform.repository';

@Injectable()
export class PlatformService {
  constructor(
    private readonly platformRepository: PlatformRepository,
    private readonly companiesService: CompaniesService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async getOverview() {
    const [totals, companies] = await Promise.all([
      this.platformRepository.getTotals(),
      this.platformRepository.getCompanies(),
    ]);

    return { totals, companies };
  }

  getCompanies() {
    return this.platformRepository.getCompanies();
  }

  getUsers() {
    return this.platformRepository.getUsers();
  }

  getParcels() {
    return this.platformRepository.getParcels();
  }

  createCompany(dto: CreateCompanyDto) {
    return this.companiesService.createCompanyWithAdmin({
      companyName: dto.companyName,
      adminName: dto.adminName,
      adminEmail: dto.adminEmail,
      adminPassword: dto.adminPassword,
    });
  }

  async createAgent(dto: CreatePlatformAgentDto) {
    await this.companiesService.getByIdOrThrow(dto.companyId);

    const existing = await this.usersRepository.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: UserRole.DELIVERY_AGENT,
      companyId: dto.companyId,
      isAvailable: dto.isAvailable ?? true,
    });
  }
}

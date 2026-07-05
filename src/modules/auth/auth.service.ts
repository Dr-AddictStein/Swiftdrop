import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtPayload } from '../../common/interfaces/authenticated-user.interface';
import { CompaniesService } from '../companies/companies.service';
import { UsersRepository } from '../users/users.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly companiesService: CompaniesService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResult({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });
  }

  async register(dto: RegisterAdminDto) {
    const { admin } = await this.companiesService.createCompanyWithAdmin({
      companyName: dto.companyName,
      adminName: dto.name,
      adminEmail: dto.email,
      adminPassword: dto.password,
    });

    return this.buildAuthResult(admin);
  }

  private buildAuthResult(user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    companyId: string | null;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }
}

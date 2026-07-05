import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreateDeliveryAgentDto } from './dto/create-delivery-agent.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { SafeUser, UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findAll(requester: AuthenticatedUser) {
    const companyId = this.requireCompanyId(requester);
    return this.usersRepository.findAll(companyId);
  }

  async createDeliveryAgent(
    dto: CreateDeliveryAgentDto,
    requester: AuthenticatedUser,
  ) {
    const companyId = this.requireCompanyId(requester);
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
      companyId,
      isAvailable: dto.isAvailable ?? true,
    });
  }

  async findById(id: string, requester: AuthenticatedUser) {
    this.assertCanViewUser(id, requester);

    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with id '${id}' not found`);
    }

    this.assertSameCompany(user, requester);

    return user;
  }

  async updateAvailability(
    id: string,
    dto: UpdateAvailabilityDto,
    requester: AuthenticatedUser,
  ) {
    this.assertCanUpdateAvailability(id, requester);

    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with id '${id}' not found`);
    }

    this.assertSameCompany(user, requester);

    if (user.role !== UserRole.DELIVERY_AGENT) {
      throw new BadRequestException(
        'Availability can only be updated for delivery agents',
      );
    }

    const updated = await this.usersRepository.updateAvailability(
      id,
      dto.isAvailable,
    );

    if (!updated) {
      throw new NotFoundException(`User with id '${id}' not found`);
    }

    return updated;
  }

  private requireCompanyId(requester: AuthenticatedUser): string {
    if (!requester.companyId) {
      throw new ForbiddenException('You must belong to a company');
    }

    return requester.companyId;
  }

  private assertSameCompany(
    user: SafeUser,
    requester: AuthenticatedUser,
  ): void {
    if (requester.id === user.id) {
      return;
    }

    if (
      requester.role === UserRole.ADMIN &&
      user.companyId === requester.companyId
    ) {
      return;
    }

    throw new ForbiddenException('User belongs to a different company');
  }

  private assertCanViewUser(id: string, requester: AuthenticatedUser): void {
    if (requester.role === UserRole.ADMIN || requester.id === id) {
      return;
    }

    throw new ForbiddenException('You can only view your own profile');
  }

  private assertCanUpdateAvailability(
    id: string,
    requester: AuthenticatedUser,
  ): void {
    if (requester.role === UserRole.ADMIN || requester.id === id) {
      return;
    }

    throw new ForbiddenException('You can only update your own availability');
  }
}

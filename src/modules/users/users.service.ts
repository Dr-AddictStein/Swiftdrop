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
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findAll() {
    return this.usersRepository.findAll();
  }

  async createDeliveryAgent(dto: CreateDeliveryAgentDto) {
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
      isAvailable: dto.isAvailable ?? true,
    });
  }

  async findById(id: string, requester: AuthenticatedUser) {
    this.assertCanViewUser(id, requester);

    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with id '${id}' not found`);
    }

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

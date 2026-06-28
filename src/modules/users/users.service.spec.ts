import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<
    Pick<UsersRepository, 'findAll' | 'findById' | 'updateAvailability'>
  >;

  const admin: AuthenticatedUser = {
    id: 'admin-id',
    email: 'admin@swiftdrop.com',
    role: UserRole.ADMIN,
  };

  const agent: AuthenticatedUser = {
    id: 'agent-id',
    email: 'agent@swiftdrop.com',
    role: UserRole.DELIVERY_AGENT,
  };

  const agentUser = {
    id: 'agent-id',
    name: 'Delivery Agent',
    email: 'agent@swiftdrop.com',
    role: UserRole.DELIVERY_AGENT,
    isAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    usersRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      updateAvailability: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: usersRepository },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('returns all users for admin listing', async () => {
    usersRepository.findAll.mockResolvedValue([agentUser]);

    await expect(service.findAll()).resolves.toEqual([agentUser]);
  });

  it('allows admin to view any user', async () => {
    usersRepository.findById.mockResolvedValue(agentUser);

    await expect(service.findById(agentUser.id, admin)).resolves.toEqual(
      agentUser,
    );
  });

  it('allows an agent to view their own profile', async () => {
    usersRepository.findById.mockResolvedValue(agentUser);

    await expect(service.findById(agentUser.id, agent)).resolves.toEqual(
      agentUser,
    );
  });

  it('prevents an agent from viewing another user profile', async () => {
    await expect(service.findById('other-id', agent)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('updates availability for the requesting delivery agent', async () => {
    usersRepository.findById.mockResolvedValue(agentUser);
    usersRepository.updateAvailability.mockResolvedValue({
      ...agentUser,
      isAvailable: false,
    });

    await expect(
      service.updateAvailability(agentUser.id, { isAvailable: false }, agent),
    ).resolves.toEqual({
      ...agentUser,
      isAvailable: false,
    });
  });

  it('prevents an agent from updating another user availability', async () => {
    await expect(
      service.updateAvailability('other-id', { isAvailable: false }, agent),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects availability updates for non-delivery-agent users', async () => {
    usersRepository.findById.mockResolvedValue({
      ...agentUser,
      id: admin.id,
      role: UserRole.ADMIN,
    });

    await expect(
      service.updateAvailability(admin.id, { isAvailable: false }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when the user does not exist', async () => {
    usersRepository.findById.mockResolvedValue(null);

    await expect(service.findById('missing-id', admin)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ParcelStatus } from '../../common/enums/parcel-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { UsersRepository } from '../users/users.repository';
import { RealtimeService } from '../realtime/realtime.service';
import { ParcelsService } from './parcels.service';
import { ParcelsRepository } from './parcels.repository';

describe('ParcelsService', () => {
  let service: ParcelsService;
  let parcelsRepository: jest.Mocked<
    Pick<
      ParcelsRepository,
      'create' | 'findById' | 'findAll' | 'assign' | 'setRetryQueued'
    >
  >;
  let usersRepository: jest.Mocked<Pick<UsersRepository, 'findById'>>;

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

  const parcel = {
    id: 'parcel-id',
    trackingNumber: 'SWD-TEST-1234',
    senderName: 'Alice Sender',
    senderAddress: '123 Sender St',
    recipientName: 'Bob Recipient',
    recipientAddress: '456 Recipient Ave',
    assignedAgentId: 'agent-id',
    status: ParcelStatus.REGISTERED,
    retryQueued: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const deliveryAgent = {
    id: 'agent-id',
    name: 'Delivery Agent',
    email: 'agent@swiftdrop.com',
    role: UserRole.DELIVERY_AGENT,
    isAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    parcelsRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      assign: jest.fn(),
      setRetryQueued: jest.fn(),
    };

    usersRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParcelsService,
        { provide: ParcelsRepository, useValue: parcelsRepository },
        { provide: UsersRepository, useValue: usersRepository },
        {
          provide: RealtimeService,
          useValue: { emitParcelUpdate: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ParcelsService);
  });

  it('creates a parcel with REGISTERED status', async () => {
    parcelsRepository.create.mockResolvedValue(parcel);

    const result = await service.create({
      senderName: parcel.senderName,
      senderAddress: parcel.senderAddress,
      recipientName: parcel.recipientName,
      recipientAddress: parcel.recipientAddress,
      trackingNumber: parcel.trackingNumber,
    });

    expect(result).toEqual(parcel);
    expect(parcelsRepository.create).toHaveBeenCalledWith({
      trackingNumber: parcel.trackingNumber,
      senderName: parcel.senderName,
      senderAddress: parcel.senderAddress,
      recipientName: parcel.recipientName,
      recipientAddress: parcel.recipientAddress,
    });
  });

  it('lists all parcels for admin with optional filters', async () => {
    parcelsRepository.findAll.mockResolvedValue([parcel]);

    await expect(
      service.findAll(
        { status: ParcelStatus.REGISTERED, sender: 'Alice' },
        admin,
      ),
    ).resolves.toEqual([parcel]);

    expect(parcelsRepository.findAll).toHaveBeenCalledWith({
      status: ParcelStatus.REGISTERED,
      sender: 'Alice',
      assignedAgentId: undefined,
    });
  });

  it('lists only assigned parcels for delivery agents', async () => {
    parcelsRepository.findAll.mockResolvedValue([parcel]);

    await expect(service.findAll({}, agent)).resolves.toEqual([parcel]);

    expect(parcelsRepository.findAll).toHaveBeenCalledWith({
      status: undefined,
      sender: undefined,
      assignedAgentId: agent.id,
    });
  });

  it('allows admin to view any parcel', async () => {
    parcelsRepository.findById.mockResolvedValue(parcel);

    await expect(service.findById(parcel.id, admin)).resolves.toEqual(parcel);
  });

  it('allows an agent to view an assigned parcel', async () => {
    parcelsRepository.findById.mockResolvedValue(parcel);

    await expect(service.findById(parcel.id, agent)).resolves.toEqual(parcel);
  });

  it('prevents an agent from viewing unassigned parcels', async () => {
    parcelsRepository.findById.mockResolvedValue({
      ...parcel,
      assignedAgentId: 'other-agent-id',
    });

    await expect(service.findById(parcel.id, agent)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('assigns a registered parcel to an available delivery agent', async () => {
    parcelsRepository.findById.mockResolvedValue({
      ...parcel,
      assignedAgentId: null,
    });
    usersRepository.findById.mockResolvedValue(deliveryAgent);
    parcelsRepository.assign.mockResolvedValue(parcel);

    await expect(
      service.assign(parcel.id, { assignedAgentId: deliveryAgent.id }),
    ).resolves.toEqual(parcel);
  });

  it('rejects assignment when the parcel is not registered', async () => {
    parcelsRepository.findById.mockResolvedValue({
      ...parcel,
      status: ParcelStatus.PICKED_UP,
    });

    await expect(
      service.assign(parcel.id, { assignedAgentId: deliveryAgent.id }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects assignment to a non-delivery-agent user', async () => {
    parcelsRepository.findById.mockResolvedValue(parcel);
    usersRepository.findById.mockResolvedValue({
      ...deliveryAgent,
      role: UserRole.ADMIN,
    });

    await expect(
      service.assign(parcel.id, { assignedAgentId: admin.id }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects assignment when the delivery agent is unavailable', async () => {
    parcelsRepository.findById.mockResolvedValue(parcel);
    usersRepository.findById.mockResolvedValue({
      ...deliveryAgent,
      isAvailable: false,
    });

    await expect(
      service.assign(parcel.id, { assignedAgentId: deliveryAgent.id }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when the parcel does not exist', async () => {
    parcelsRepository.findById.mockResolvedValue(null);

    await expect(service.findById('missing-id', admin)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists queued retries for admins across all agents', async () => {
    parcelsRepository.findAll.mockResolvedValue([
      { ...parcel, status: ParcelStatus.FAILED_ATTEMPT, retryQueued: true },
    ]);

    await expect(service.findRetryQueue(admin)).resolves.toHaveLength(1);
    expect(parcelsRepository.findAll).toHaveBeenCalledWith({
      retryQueued: true,
      assignedAgentId: undefined,
    });
  });

  it('lists queued retries for agents scoped to their assignments', async () => {
    parcelsRepository.findAll.mockResolvedValue([]);

    await service.findRetryQueue(agent);

    expect(parcelsRepository.findAll).toHaveBeenCalledWith({
      retryQueued: true,
      assignedAgentId: agent.id,
    });
  });

  it('re-queues a failed parcel for admin retry management', async () => {
    parcelsRepository.findById.mockResolvedValue({
      ...parcel,
      status: ParcelStatus.FAILED_ATTEMPT,
      retryQueued: false,
    });
    parcelsRepository.setRetryQueued.mockResolvedValue({
      ...parcel,
      status: ParcelStatus.FAILED_ATTEMPT,
      retryQueued: true,
    });

    await expect(service.requeue(parcel.id)).resolves.toMatchObject({
      retryQueued: true,
    });
  });

  it('rejects re-queue when the parcel is not in failed status', async () => {
    parcelsRepository.findById.mockResolvedValue(parcel);

    await expect(service.requeue(parcel.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

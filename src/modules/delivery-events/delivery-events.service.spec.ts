import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InvalidStatusTransitionException } from '../../common/exceptions/invalid-status-transition.exception';
import { ParcelStatus } from '../../common/enums/parcel-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { DrizzleService } from '../../database/drizzle.service';
import { DeliveryEventsService } from './delivery-events.service';
import { DeliveryEventsRepository } from './delivery-events.repository';

describe('DeliveryEventsService', () => {
  let service: DeliveryEventsService;
  let drizzleService: {
    db: {
      select: jest.Mock;
      transaction: jest.Mock;
    };
  };
  let deliveryEventsRepository: jest.Mocked<
    Pick<DeliveryEventsRepository, 'findByParcelId'>
  >;

  const agent: AuthenticatedUser = {
    id: 'agent-id',
    email: 'agent@swiftdrop.com',
    role: UserRole.DELIVERY_AGENT,
  };

  const admin: AuthenticatedUser = {
    id: 'admin-id',
    email: 'admin@swiftdrop.com',
    role: UserRole.ADMIN,
  };

  const parcel = {
    id: 'parcel-id',
    trackingNumber: 'SWD-TEST',
    senderName: 'Alice',
    senderAddress: '123 St',
    recipientName: 'Bob',
    recipientAddress: '456 Ave',
    assignedAgentId: 'agent-id',
    status: ParcelStatus.REGISTERED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const event = {
    id: 'event-id',
    parcelId: parcel.id,
    status: ParcelStatus.PICKED_UP,
    remarks: 'Picked up from sender',
    createdBy: agent.id,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    drizzleService = {
      db: {
        select: jest.fn(),
        transaction: jest.fn(),
      },
    };

    deliveryEventsRepository = {
      findByParcelId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryEventsService,
        { provide: DrizzleService, useValue: drizzleService },
        {
          provide: DeliveryEventsRepository,
          useValue: deliveryEventsRepository,
        },
      ],
    }).compile();

    service = module.get(DeliveryEventsService);
  });

  const mockParcelLookup = (result: typeof parcel | null) => {
    drizzleService.db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            then: (resolve: (value: unknown[]) => void) =>
              Promise.resolve(result ? [result] : []).then(resolve),
          }),
        }),
      }),
    });
  };

  it('records a valid status change inside a transaction', async () => {
    mockParcelLookup(parcel);

    const updatedParcel = { ...parcel, status: ParcelStatus.PICKED_UP };
    const tx = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([event]),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedParcel]),
          }),
        }),
      }),
    };

    drizzleService.db.transaction.mockImplementation(
      (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
    );

    await expect(
      service.recordStatusChange(
        parcel.id,
        ParcelStatus.PICKED_UP,
        agent,
        'Picked up from sender',
      ),
    ).resolves.toEqual({
      parcel: updatedParcel,
      event,
    });

    expect(drizzleService.db.transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid status transitions', async () => {
    mockParcelLookup(parcel);

    await expect(
      service.recordStatusChange(parcel.id, ParcelStatus.DELIVERED, agent),
    ).rejects.toBeInstanceOf(InvalidStatusTransitionException);
  });

  it('prevents non-agents from updating parcel status', async () => {
    mockParcelLookup(parcel);

    await expect(
      service.recordStatusChange(parcel.id, ParcelStatus.PICKED_UP, admin),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents agents from updating parcels assigned to others', async () => {
    mockParcelLookup({
      ...parcel,
      assignedAgentId: 'other-agent-id',
    });

    await expect(
      service.recordStatusChange(parcel.id, ParcelStatus.PICKED_UP, agent),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns the delivery timeline for authorized users', async () => {
    mockParcelLookup(parcel);
    deliveryEventsRepository.findByParcelId.mockResolvedValue([event]);

    await expect(service.getTimeline(parcel.id, admin)).resolves.toEqual([
      event,
    ]);
  });

  it('throws when the parcel does not exist', async () => {
    mockParcelLookup(null);

    await expect(
      service.getTimeline('missing-id', admin),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

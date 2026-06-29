import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ParcelStatus } from '../../common/enums/parcel-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { UsersRepository } from '../users/users.repository';
import { AssignParcelDto } from './dto/assign-parcel.dto';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { ListParcelsQueryDto } from './dto/list-parcels-query.dto';
import { ParcelsRepository } from './parcels.repository';
import { generateTrackingNumber } from './utils/tracking-number.util';

@Injectable()
export class ParcelsService {
  constructor(
    private readonly parcelsRepository: ParcelsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  create(dto: CreateParcelDto) {
    const trackingNumber = dto.trackingNumber ?? generateTrackingNumber();

    return this.parcelsRepository.create({
      trackingNumber,
      senderName: dto.senderName,
      senderAddress: dto.senderAddress,
      recipientName: dto.recipientName,
      recipientAddress: dto.recipientAddress,
    });
  }

  async findAll(query: ListParcelsQueryDto, requester: AuthenticatedUser) {
    const filters = {
      status: query.status,
      sender: query.sender,
      assignedAgentId:
        requester.role === UserRole.DELIVERY_AGENT ? requester.id : undefined,
    };

    return this.parcelsRepository.findAll(filters);
  }

  async findById(id: string, requester: AuthenticatedUser) {
    const parcel = await this.parcelsRepository.findById(id);

    if (!parcel) {
      throw new NotFoundException(`Parcel with id '${id}' not found`);
    }

    this.assertCanViewParcel(parcel, requester);

    return parcel;
  }

  async assign(id: string, dto: AssignParcelDto) {
    const parcel = await this.parcelsRepository.findById(id);

    if (!parcel) {
      throw new NotFoundException(`Parcel with id '${id}' not found`);
    }

    if (parcel.status !== ParcelStatus.REGISTERED) {
      throw new BadRequestException(
        'Only parcels in REGISTERED status can be assigned',
      );
    }

    const agent = await this.usersRepository.findById(dto.assignedAgentId);

    if (!agent) {
      throw new NotFoundException(
        `Delivery agent with id '${dto.assignedAgentId}' not found`,
      );
    }

    if (agent.role !== UserRole.DELIVERY_AGENT) {
      throw new BadRequestException(
        'Parcels can only be assigned to delivery agents',
      );
    }

    if (!agent.isAvailable) {
      throw new BadRequestException(
        'Delivery agent is not available for assignment',
      );
    }

    const updated = await this.parcelsRepository.assign(
      id,
      dto.assignedAgentId,
    );

    if (!updated) {
      throw new NotFoundException(`Parcel with id '${id}' not found`);
    }

    return updated;
  }

  findRetryQueue(requester: AuthenticatedUser) {
    return this.parcelsRepository.findAll({
      retryQueued: true,
      assignedAgentId:
        requester.role === UserRole.DELIVERY_AGENT ? requester.id : undefined,
    });
  }

  async requeue(id: string) {
    const parcel = await this.parcelsRepository.findById(id);

    if (!parcel) {
      throw new NotFoundException(`Parcel with id '${id}' not found`);
    }

    if (parcel.status !== ParcelStatus.FAILED_ATTEMPT) {
      throw new BadRequestException(
        'Only parcels in FAILED_ATTEMPT status can be re-queued',
      );
    }

    const updated = await this.parcelsRepository.setRetryQueued(id, true);

    if (!updated) {
      throw new NotFoundException(`Parcel with id '${id}' not found`);
    }

    return updated;
  }

  private assertCanViewParcel(
    parcel: { assignedAgentId: string | null },
    requester: AuthenticatedUser,
  ): void {
    if (requester.role === UserRole.ADMIN) {
      return;
    }

    if (parcel.assignedAgentId === requester.id) {
      return;
    }

    throw new ForbiddenException('You can only view parcels assigned to you');
  }
}

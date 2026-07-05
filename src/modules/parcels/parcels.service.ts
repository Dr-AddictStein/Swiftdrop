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
import { RealtimeService } from '../realtime/realtime.service';
import { AssignParcelDto } from './dto/assign-parcel.dto';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { ListParcelsQueryDto } from './dto/list-parcels-query.dto';
import { ParcelRecord, ParcelsRepository } from './parcels.repository';
import { generateTrackingNumber } from './utils/tracking-number.util';

export interface ReassignmentResult {
  reassignments: Array<{
    parcelId: string;
    trackingNumber: string;
    fromAgentId: string;
    toAgentId: string;
  }>;
  unassigned: Array<{
    parcelId: string;
    trackingNumber: string;
  }>;
}

@Injectable()
export class ParcelsService {
  constructor(
    private readonly parcelsRepository: ParcelsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly realtimeService: RealtimeService,
  ) {}

  async create(dto: CreateParcelDto, requester: AuthenticatedUser) {
    const companyId = this.requireCompanyId(requester);
    const trackingNumber = dto.trackingNumber ?? generateTrackingNumber();

    const parcel = await this.parcelsRepository.create({
      trackingNumber,
      companyId,
      senderName: dto.senderName,
      senderAddress: dto.senderAddress,
      recipientName: dto.recipientName,
      recipientAddress: dto.recipientAddress,
    });

    this.realtimeService.emitParcelUpdate(parcel);

    return parcel;
  }

  async findAll(query: ListParcelsQueryDto, requester: AuthenticatedUser) {
    const companyId = this.requireCompanyId(requester);

    const filters = {
      companyId,
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

  async assign(id: string, dto: AssignParcelDto, requester: AuthenticatedUser) {
    const companyId = this.requireCompanyId(requester);
    const parcel = await this.parcelsRepository.findById(id);

    if (!parcel || parcel.companyId !== companyId) {
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

    if (agent.companyId !== companyId) {
      throw new BadRequestException(
        'Delivery agent belongs to a different company',
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

    this.realtimeService.emitParcelUpdate(updated);

    return updated;
  }

  findRetryQueue(requester: AuthenticatedUser) {
    const companyId = this.requireCompanyId(requester);

    return this.parcelsRepository.findAll({
      companyId,
      retryQueued: true,
      assignedAgentId:
        requester.role === UserRole.DELIVERY_AGENT ? requester.id : undefined,
    });
  }

  async requeue(id: string, requester: AuthenticatedUser) {
    const companyId = this.requireCompanyId(requester);
    const parcel = await this.parcelsRepository.findById(id);

    if (!parcel || parcel.companyId !== companyId) {
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

    this.realtimeService.emitParcelUpdate(updated);

    return updated;
  }

  /**
   * Redistributes every still-active (non-delivered) parcel currently held by
   * `agentId` to the least-loaded available agent in the same company. When no
   * other agent is available the parcel is left unassigned and flagged for
   * manual handling. Returns a summary the caller can use for notifications.
   */
  async reassignActiveParcelsFromAgent(
    agentId: string,
    companyId: string,
    actorId: string,
    reason: string,
  ): Promise<ReassignmentResult> {
    const activeParcels = await this.parcelsRepository.findActiveByAgent(
      agentId,
      companyId,
    );

    const result: ReassignmentResult = {
      reassignments: [],
      unassigned: [],
    };

    for (const parcel of activeParcels) {
      const candidateId =
        await this.parcelsRepository.findLeastLoadedAvailableAgentId(
          companyId,
          agentId,
        );

      if (candidateId) {
        const remarks =
          `Auto-reassigned from agent ${agentId} to agent ${candidateId}. ` +
          `Reason: ${reason}`;

        const updated = await this.parcelsRepository.reassignParcel(
          parcel.id,
          candidateId,
          actorId,
          remarks,
        );

        if (updated) {
          this.emitUpdate(updated);
          result.reassignments.push({
            parcelId: parcel.id,
            trackingNumber: parcel.trackingNumber,
            fromAgentId: agentId,
            toAgentId: candidateId,
          });
        }
      } else {
        const remarks =
          `Unassigned after agent ${agentId} became unavailable. ` +
          `Reason: ${reason}. Awaiting manual assignment.`;

        const updated = await this.parcelsRepository.reassignParcel(
          parcel.id,
          null,
          actorId,
          remarks,
        );

        if (updated) {
          this.emitUpdate(updated);
          result.unassigned.push({
            parcelId: parcel.id,
            trackingNumber: parcel.trackingNumber,
          });
        }
      }
    }

    return result;
  }

  private emitUpdate(parcel: ParcelRecord): void {
    this.realtimeService.emitParcelUpdate(parcel);
  }

  private requireCompanyId(requester: AuthenticatedUser): string {
    if (!requester.companyId) {
      throw new ForbiddenException(
        'You must belong to a company to manage parcels',
      );
    }

    return requester.companyId;
  }

  private assertCanViewParcel(
    parcel: { companyId: string; assignedAgentId: string | null },
    requester: AuthenticatedUser,
  ): void {
    if (
      requester.role === UserRole.ADMIN &&
      parcel.companyId === requester.companyId
    ) {
      return;
    }

    if (
      requester.role === UserRole.DELIVERY_AGENT &&
      parcel.assignedAgentId === requester.id
    ) {
      return;
    }

    throw new ForbiddenException('You can only view parcels assigned to you');
  }
}

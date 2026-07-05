import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CompaniesRepository } from '../companies/companies.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { ParcelsService, ReassignmentResult } from '../parcels/parcels.service';
import { SafeUser, UsersRepository } from '../users/users.repository';

@Injectable()
export class AgentsService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly companiesRepository: CompaniesRepository,
    private readonly parcelsService: ParcelsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Corner case 2: an agent moves to a different delivery company. Before the
   * move, every active parcel they still hold in the current company is
   * redistributed to remaining teammates and the old admin is notified.
   */
  async switchCompany(requester: AuthenticatedUser, joinCode: string) {
    const agent = await this.getAgentOrThrow(requester.id);

    const targetCompany = await this.companiesRepository.findByJoinCode(
      joinCode.trim().toUpperCase(),
    );

    if (!targetCompany) {
      throw new NotFoundException(
        'No company found for the provided join code',
      );
    }

    if (agent.companyId === targetCompany.id) {
      throw new BadRequestException(
        'You already belong to this delivery company',
      );
    }

    let reassignment: ReassignmentResult = {
      reassignments: [],
      unassigned: [],
    };

    if (agent.companyId) {
      const previousCompanyId = agent.companyId;
      const actorId = await this.resolveActor(previousCompanyId, agent.id);
      const reason = `Agent left the company to join ${targetCompany.name}`;

      reassignment = await this.parcelsService.reassignActiveParcelsFromAgent(
        agent.id,
        previousCompanyId,
        actorId,
        reason,
      );

      await this.notifyCompanyOwner(previousCompanyId, {
        type: NotificationType.AGENT_LEFT_COMPANY,
        message:
          `${agent.name} left your company. ` +
          this.describeReassignment(reassignment),
        metadata: {
          agentId: agent.id,
          agentName: agent.name,
          movedToCompanyId: targetCompany.id,
          ...this.reassignmentMetadata(reassignment),
        },
      });

      await this.notifyManualAssignment(previousCompanyId, reassignment);
    }

    const updatedAgent = await this.usersRepository.updateCompany(
      agent.id,
      targetCompany.id,
      true,
    );

    await this.notifyCompanyOwner(targetCompany.id, {
      type: NotificationType.AGENT_JOINED_COMPANY,
      message: `${agent.name} joined your company and is available for deliveries.`,
      metadata: { agentId: agent.id, agentName: agent.name },
    });

    return {
      agent: updatedAgent,
      previousCompanyReassignment: reassignment,
    };
  }

  /**
   * Corner case 1: an agent can no longer complete their deliveries (accident,
   * gone offline, etc.). The agent is marked unavailable and all their active
   * parcels are auto-assigned to the least-loaded available teammate. The admin
   * is notified. Can be triggered by the agent themselves or by their admin.
   */
  async reportIncident(
    targetAgentId: string,
    requester: AuthenticatedUser,
    reason?: string,
  ) {
    const agent = await this.getAgentOrThrow(targetAgentId);

    if (!agent.companyId) {
      throw new BadRequestException('Agent is not associated with any company');
    }

    if (requester.role === UserRole.ADMIN) {
      if (requester.companyId !== agent.companyId) {
        throw new ForbiddenException(
          'You can only manage agents in your own company',
        );
      }
    } else if (requester.id !== agent.id) {
      throw new ForbiddenException(
        'You can only report an incident for yourself',
      );
    }

    const companyId = agent.companyId;
    const incidentReason = reason?.trim() || 'Agent reported unable to deliver';

    await this.usersRepository.updateAvailability(agent.id, false);

    const actorId = await this.resolveActor(companyId, requester.id);

    const reassignment =
      await this.parcelsService.reassignActiveParcelsFromAgent(
        agent.id,
        companyId,
        actorId,
        incidentReason,
      );

    await this.notifyCompanyOwner(companyId, {
      type: NotificationType.AGENT_INCIDENT_REPORTED,
      message:
        `${agent.name} can no longer deliver (${incidentReason}). ` +
        this.describeReassignment(reassignment),
      metadata: {
        agentId: agent.id,
        agentName: agent.name,
        reason: incidentReason,
        ...this.reassignmentMetadata(reassignment),
      },
    });

    await this.notifyManualAssignment(companyId, reassignment);

    return {
      agentId: agent.id,
      companyId,
      reason: incidentReason,
      ...reassignment,
    };
  }

  private async getAgentOrThrow(id: string): Promise<SafeUser> {
    const agent = await this.usersRepository.findById(id);

    if (!agent) {
      throw new NotFoundException(`User with id '${id}' not found`);
    }

    if (agent.role !== UserRole.DELIVERY_AGENT) {
      throw new BadRequestException('Target user is not a delivery agent');
    }

    return agent;
  }

  private async resolveActor(
    companyId: string,
    fallbackId: string,
  ): Promise<string> {
    const company = await this.companiesRepository.findById(companyId);
    return company?.ownerId ?? fallbackId;
  }

  private async notifyCompanyOwner(
    companyId: string,
    payload: {
      type: NotificationType;
      message: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    const company = await this.companiesRepository.findById(companyId);

    if (!company?.ownerId) {
      return;
    }

    await this.notificationsService.create({
      companyId,
      recipientId: company.ownerId,
      type: payload.type,
      message: payload.message,
      metadata: payload.metadata,
    });
  }

  private async notifyManualAssignment(
    companyId: string,
    reassignment: ReassignmentResult,
  ): Promise<void> {
    if (reassignment.unassigned.length === 0) {
      return;
    }

    await this.notifyCompanyOwner(companyId, {
      type: NotificationType.PARCEL_NEEDS_MANUAL_ASSIGNMENT,
      message:
        `${reassignment.unassigned.length} parcel(s) could not be auto-assigned ` +
        `(no available agents) and need manual assignment.`,
      metadata: {
        unassigned: reassignment.unassigned,
      },
    });
  }

  private describeReassignment(reassignment: ReassignmentResult): string {
    const reassigned = reassignment.reassignments.length;
    const unassigned = reassignment.unassigned.length;

    if (reassigned === 0 && unassigned === 0) {
      return 'No active parcels needed reassignment.';
    }

    const parts: string[] = [];

    if (reassigned > 0) {
      parts.push(`${reassigned} parcel(s) auto-assigned to other agents`);
    }

    if (unassigned > 0) {
      parts.push(`${unassigned} parcel(s) left unassigned for manual handling`);
    }

    return `${parts.join(' and ')}.`;
  }

  private reassignmentMetadata(
    reassignment: ReassignmentResult,
  ): Record<string, unknown> {
    return {
      reassignments: reassignment.reassignments,
      unassigned: reassignment.unassigned,
    };
  }
}

import type { ParcelStatus, User } from '../types';

export function resolveAgent(
  agents: User[],
  agentId: string | null | undefined,
): User | null {
  if (!agentId) return null;
  return agents.find((a) => a.id === agentId) ?? null;
}

export function getAgentActivityLabel(status: ParcelStatus): string {
  switch (status) {
    case 'REGISTERED':
      return 'Assigned — awaiting pickup';
    case 'PICKED_UP':
      return 'Picked up — preparing for delivery';
    case 'OUT_FOR_DELIVERY':
      return 'Currently out for delivery';
    case 'DELIVERED':
      return 'Completed this delivery';
    case 'FAILED_ATTEMPT':
      return 'Reported a failed delivery attempt';
    default:
      return 'Handling this parcel';
  }
}

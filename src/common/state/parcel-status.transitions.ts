import { ParcelStatus } from '../enums/parcel-status.enum';
import { InvalidStatusTransitionException } from '../exceptions/invalid-status-transition.exception';

export const PARCEL_STATUS_TRANSITIONS: Record<ParcelStatus, ParcelStatus[]> = {
  [ParcelStatus.REGISTERED]: [ParcelStatus.PICKED_UP],
  [ParcelStatus.PICKED_UP]: [ParcelStatus.OUT_FOR_DELIVERY],
  [ParcelStatus.OUT_FOR_DELIVERY]: [
    ParcelStatus.DELIVERED,
    ParcelStatus.FAILED_ATTEMPT,
  ],
  [ParcelStatus.FAILED_ATTEMPT]: [ParcelStatus.OUT_FOR_DELIVERY],
  [ParcelStatus.DELIVERED]: [],
};

export function assertValidStatusTransition(
  from: ParcelStatus,
  to: ParcelStatus,
): void {
  const allowedTargets = PARCEL_STATUS_TRANSITIONS[from];

  if (!allowedTargets.includes(to)) {
    throw new InvalidStatusTransitionException(from, to);
  }
}

export function isValidStatusTransition(
  from: ParcelStatus,
  to: ParcelStatus,
): boolean {
  return PARCEL_STATUS_TRANSITIONS[from].includes(to);
}

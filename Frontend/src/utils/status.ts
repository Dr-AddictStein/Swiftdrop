import type { ParcelStatus } from '../types';

const TRANSITIONS: Record<ParcelStatus, ParcelStatus[]> = {
  REGISTERED: ['PICKED_UP'],
  PICKED_UP: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED_ATTEMPT'],
  FAILED_ATTEMPT: ['OUT_FOR_DELIVERY'],
  DELIVERED: [],
};

export function getNextStatuses(current: ParcelStatus): ParcelStatus[] {
  return TRANSITIONS[current] ?? [];
}

export const STATUS_LABELS: Record<ParcelStatus, string> = {
  REGISTERED: 'Registered',
  PICKED_UP: 'Picked Up',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  FAILED_ATTEMPT: 'Failed Attempt',
};

export function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

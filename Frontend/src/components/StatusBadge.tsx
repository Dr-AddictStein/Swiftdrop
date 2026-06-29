import type { ParcelStatus } from '../types';
import { STATUS_LABELS } from '../utils/status';

const STATUS_CLASS: Record<ParcelStatus, string> = {
  REGISTERED: 'status--registered',
  PICKED_UP: 'status--picked-up',
  OUT_FOR_DELIVERY: 'status--out-for-delivery',
  DELIVERED: 'status--delivered',
  FAILED_ATTEMPT: 'status--failed',
};

export function StatusBadge({ status }: { status: ParcelStatus }) {
  return (
    <span className={`status-badge ${STATUS_CLASS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

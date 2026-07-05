import type { NotificationRecord } from '../notifications/notifications.repository';
import type { ParcelRecord } from '../parcels/parcels.repository';

export type RealtimeEventType = 'parcel.updated' | 'notification.created';

export interface ParcelUpdatedEvent {
  type: 'parcel.updated';
  parcel: ParcelRecord;
}

export interface NotificationCreatedEvent {
  type: 'notification.created';
  notification: NotificationRecord;
}

export type RealtimeEvent = ParcelUpdatedEvent | NotificationCreatedEvent;

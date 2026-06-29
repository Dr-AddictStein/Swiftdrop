import type { ParcelRecord } from '../parcels/parcels.repository';

export type RealtimeEventType = 'parcel.updated';

export interface ParcelUpdatedEvent {
  type: RealtimeEventType;
  parcel: ParcelRecord;
}

export type RealtimeEvent = ParcelUpdatedEvent;

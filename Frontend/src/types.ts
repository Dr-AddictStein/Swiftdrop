export type UserRole = 'ADMIN' | 'DELIVERY_AGENT';

export type ParcelStatus =
  | 'REGISTERED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED_ATTEMPT';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Parcel {
  id: string;
  trackingNumber: string;
  senderName: string;
  senderAddress: string;
  recipientName: string;
  recipientAddress: string;
  assignedAgentId: string | null;
  status: ParcelStatus;
  retryQueued: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryEvent {
  id: string;
  parcelId: string;
  status: ParcelStatus;
  remarks: string | null;
  createdBy: string;
  createdAt: string;
}

export interface StatusChangeResult {
  parcel: Parcel;
  event: DeliveryEvent;
}

export interface AgentReport {
  agentId: string;
  agentName: string;
  agentEmail: string;
  totalDeliveries: number;
  successRate: number;
  averagePickupToDeliveryMinutes: number | null;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp?: string;
  path?: string;
}

export const PARCEL_STATUSES: ParcelStatus[] = [
  'REGISTERED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED_ATTEMPT',
];

export interface ParcelUpdatedEvent {
  type: 'parcel.updated';
  parcel: Parcel;
}

export type RealtimeEvent = ParcelUpdatedEvent | { type: 'heartbeat' };

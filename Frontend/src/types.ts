export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'DELIVERY_AGENT';

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
  companyId: string | null;
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
  companyId: string | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  joinCode: string;
}

export interface CompanyDetail extends Company {
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'AGENT_LEFT_COMPANY'
  | 'AGENT_JOINED_COMPANY'
  | 'AGENT_INCIDENT_REPORTED'
  | 'PARCEL_REASSIGNED'
  | 'PARCEL_NEEDS_MANUAL_ASSIGNMENT';

export interface AppNotification {
  id: string;
  companyId: string;
  recipientId: string;
  type: NotificationType;
  message: string;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface ReassignmentResult {
  reassignments: Array<{
    parcelId: string;
    trackingNumber: string;
    fromAgentId: string;
    toAgentId: string;
  }>;
  unassigned: Array<{ parcelId: string; trackingNumber: string }>;
}

export interface PlatformCompany {
  id: string;
  name: string;
  joinCode: string;
  ownerName: string | null;
  ownerEmail: string | null;
  agentCount: number;
  parcelCount: number;
  deliveredCount: number;
  createdAt: string;
}

export interface PlatformOverview {
  totals: {
    companies: number;
    admins: number;
    agents: number;
    parcels: number;
    parcelsByStatus: Record<string, number>;
  };
  companies: PlatformCompany[];
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  companyName: string | null;
  isAvailable: boolean;
  createdAt: string;
}

export interface PlatformParcel {
  id: string;
  trackingNumber: string;
  status: ParcelStatus;
  retryQueued: boolean;
  companyId: string;
  companyName: string | null;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  senderName: string;
  recipientName: string;
  createdAt: string;
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

export interface NotificationCreatedEvent {
  type: 'notification.created';
  notification: AppNotification;
}

export type RealtimeEvent =
  | ParcelUpdatedEvent
  | NotificationCreatedEvent
  | { type: 'heartbeat' };

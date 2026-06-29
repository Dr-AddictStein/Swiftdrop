import { apiRequest } from '../api';
import type {
  AgentReport,
  DeliveryEvent,
  LoginResponse,
  Parcel,
  ParcelStatus,
  StatusChangeResult,
  User,
} from '../types';

export function login(email: string, password: string) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuth: true,
  });
}

export function fetchUsers(token: string) {
  return apiRequest<User[]>('/users', { token });
}

export function createDeliveryAgent(
  token: string,
  data: {
    name: string;
    email: string;
    password: string;
    isAvailable?: boolean;
  },
) {
  return apiRequest<User>('/users', {
    method: 'POST',
    token,
    body: data,
  });
}

export function fetchUser(token: string, id: string) {
  return apiRequest<User>(`/users/${id}`, { token });
}

export function updateAvailability(
  token: string,
  id: string,
  isAvailable: boolean,
) {
  return apiRequest<User>(`/users/${id}/availability`, {
    method: 'PATCH',
    token,
    body: { isAvailable },
  });
}

export function fetchParcels(
  token: string,
  params?: { status?: string; sender?: string },
) {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.sender) search.set('sender', params.sender);
  const qs = search.toString();
  return apiRequest<Parcel[]>(`/parcels${qs ? `?${qs}` : ''}`, { token });
}

export function fetchParcel(token: string, id: string) {
  return apiRequest<Parcel>(`/parcels/${id}`, { token });
}

export function createParcel(
  token: string,
  data: {
    trackingNumber?: string;
    senderName: string;
    senderAddress: string;
    recipientName: string;
    recipientAddress: string;
  },
) {
  return apiRequest<Parcel>('/parcels', { method: 'POST', token, body: data });
}

export function assignParcel(
  token: string,
  parcelId: string,
  assignedAgentId: string,
) {
  return apiRequest<Parcel>(`/parcels/${parcelId}/assign`, {
    method: 'PATCH',
    token,
    body: { assignedAgentId },
  });
}

export function updateParcelStatus(
  token: string,
  parcelId: string,
  status: ParcelStatus,
  remarks?: string,
) {
  return apiRequest<StatusChangeResult>(`/parcels/${parcelId}/status`, {
    method: 'PATCH',
    token,
    body: { status, remarks },
  });
}

export function fetchParcelHistory(token: string, parcelId: string) {
  return apiRequest<DeliveryEvent[]>(`/parcels/${parcelId}/history`, {
    token,
  });
}

export function fetchRetryQueue(token: string) {
  return apiRequest<Parcel[]>('/parcels/retry-queue', { token });
}

export function requeueParcel(token: string, parcelId: string) {
  return apiRequest<Parcel>(`/parcels/${parcelId}/requeue`, {
    method: 'PATCH',
    token,
    body: {},
  });
}

export function dispatchRetry(
  token: string,
  parcelId: string,
  remarks?: string,
) {
  return apiRequest<StatusChangeResult>(
    `/parcels/${parcelId}/retry-dispatch`,
    {
      method: 'PATCH',
      token,
      body: { remarks },
    },
  );
}

export function fetchAgentReports(token: string) {
  return apiRequest<AgentReport[]>('/reports/agents', { token });
}

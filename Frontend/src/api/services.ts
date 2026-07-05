import { apiRequest } from '../api';
import type {
  AgentReport,
  AppNotification,
  Company,
  CompanyDetail,
  DeliveryEvent,
  LoginResponse,
  Parcel,
  ParcelStatus,
  PlatformCompany,
  PlatformOverview,
  PlatformParcel,
  PlatformUser,
  ReassignmentResult,
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

export function registerCompany(data: {
  companyName: string;
  name: string;
  email: string;
  password: string;
}) {
  return apiRequest<LoginResponse>('/auth/register', {
    method: 'POST',
    body: data,
    skipAuth: true,
  });
}

export function fetchCompanies(token: string) {
  return apiRequest<Company[]>('/companies', { token });
}

export function fetchMyCompany(token: string) {
  return apiRequest<CompanyDetail>('/companies/me', { token });
}

export function switchCompany(token: string, joinCode: string) {
  return apiRequest<{ agent: User; previousCompanyReassignment: ReassignmentResult }>(
    '/agents/me/switch-company',
    { method: 'POST', token, body: { joinCode } },
  );
}

export function reportMyIncident(token: string, reason?: string) {
  return apiRequest<
    ReassignmentResult & { agentId: string; companyId: string; reason: string }
  >('/agents/me/report-incident', { method: 'POST', token, body: { reason } });
}

export function reportAgentIncident(
  token: string,
  agentId: string,
  reason?: string,
) {
  return apiRequest<
    ReassignmentResult & { agentId: string; companyId: string; reason: string }
  >(`/agents/${agentId}/report-incident`, {
    method: 'POST',
    token,
    body: { reason },
  });
}

export function fetchNotifications(token: string) {
  return apiRequest<AppNotification[]>('/notifications', { token });
}

export function markNotificationRead(token: string, id: string) {
  return apiRequest<AppNotification>(`/notifications/${id}/read`, {
    method: 'PATCH',
    token,
    body: {},
  });
}

export function fetchPlatformOverview(token: string) {
  return apiRequest<PlatformOverview>('/platform/overview', { token });
}

export function fetchPlatformCompanies(token: string) {
  return apiRequest<PlatformCompany[]>('/platform/companies', { token });
}

export function createPlatformCompany(
  token: string,
  data: {
    companyName: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
  },
) {
  return apiRequest<{ company: CompanyDetail }>('/platform/companies', {
    method: 'POST',
    token,
    body: data,
  });
}

export function fetchPlatformUsers(token: string) {
  return apiRequest<PlatformUser[]>('/platform/users', { token });
}

export function createPlatformAgent(
  token: string,
  data: {
    companyId: string;
    name: string;
    email: string;
    password: string;
    isAvailable?: boolean;
  },
) {
  return apiRequest<User>('/platform/agents', {
    method: 'POST',
    token,
    body: data,
  });
}

export function fetchPlatformParcels(token: string) {
  return apiRequest<PlatformParcel[]>('/platform/parcels', { token });
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

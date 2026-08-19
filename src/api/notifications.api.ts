import api from './client';
import type {
  AppNotification,
  NotificationCreatePayload,
  NotificationList,
  NotificationStatus,
  NotificationType,
} from '../types';

export interface NotificationListParams {
  read?: boolean;
  status?: NotificationStatus;
  type?: NotificationType;
  patientId?: string;
  page?: number;
  limit?: number;
}

export interface NotificationListResult {
  items: AppNotification[];
  total: number;
  page: number;
  limit: number;
}

export async function getNotifications(params?: NotificationListParams): Promise<NotificationListResult> {
  const query: Record<string, string> = {};
  if (params?.read === true) query.read = 'true';
  if (params?.read === false) query.read = 'false';
  if (params?.status) query.status = params.status;
  if (params?.type) query.type = params.type;
  if (params?.patientId) query.patientId = params.patientId;
  if (params?.page) query.page = String(params.page);
  if (params?.limit) query.limit = String(params.limit);

  const { data } = await api.get<NotificationListResult>('/notifications', {
    params: Object.keys(query).length ? query : undefined,
  });
  return data;
}

export async function getNotification(id: string) {
  const { data } = await api.get<AppNotification>(`/notifications/${id}`);
  return data;
}

export async function createNotification(payload: NotificationCreatePayload) {
  const { data } = await api.post<AppNotification>('/notifications', payload);
  return data;
}

export async function markNotificationAsRead(id: string) {
  const { data } = await api.patch<AppNotification>(`/notifications/${id}/read`);
  return data;
}

export async function cancelNotification(id: string) {
  const { data } = await api.patch<AppNotification>(`/notifications/${id}/cancel`);
  return data;
}

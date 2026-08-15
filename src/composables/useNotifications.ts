import { ref } from 'vue';
import * as notificationsApi from '../api/notifications.api';
import type { NotificationListParams } from '../api/notifications.api';
import type { AppNotification, NotificationCreatePayload } from '../types';
import { useApiError } from './useApiError';
import { notificationApiMessage } from '../utils/notifications';

/** Shared across Topbar + NotificationsView (no dedicated Pinia store). */
const sharedUnreadCount = ref(0);

/**
 * État local notifications (pas de store Pinia métier).
 * unreadCount est partagé pour le badge Topbar.
 */
export function useNotifications() {
  const notifications = ref<AppNotification[]>([]);
  const notification = ref<AppNotification | null>(null);
  const total = ref(0);
  const unreadCount = sharedUnreadCount;
  const loading = ref(false);
  const saving = ref(false);
  const actingId = ref<string | null>(null);
  const { error, errorMessage, setError, clearError } = useApiError();
  const actionMessage = ref<string | null>(null);

  function applyError(err: unknown, context: 'load' | 'create' | 'read' | 'cancel') {
    setError(err);
    actionMessage.value = notificationApiMessage(err, context);
  }

  function replaceLocal(updated: AppNotification) {
    notifications.value = notifications.value.map((n) =>
      n.id === updated.id ? updated : n
    );
    if (notification.value?.id === updated.id) notification.value = updated;
  }

  async function fetchNotifications(params?: NotificationListParams) {
    loading.value = true;
    clearError();
    actionMessage.value = null;
    try {
      const data = await notificationsApi.getNotifications(params);
      notifications.value = data.items || [];
      total.value = data.total ?? notifications.value.length;
      return data;
    } catch (err) {
      applyError(err, 'load');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUnreadCount() {
    try {
      const data = await notificationsApi.getNotifications({ read: false });
      unreadCount.value = data.total ?? (data.items || []).length;
      return unreadCount.value;
    } catch {
      unreadCount.value = 0;
      return 0;
    }
  }

  async function fetchNotification(id: string) {
    loading.value = true;
    clearError();
    actionMessage.value = null;
    try {
      notification.value = await notificationsApi.getNotification(id);
      return notification.value;
    } catch (err) {
      applyError(err, 'load');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createNotification(payload: NotificationCreatePayload) {
    saving.value = true;
    clearError();
    actionMessage.value = null;
    try {
      const created = await notificationsApi.createNotification(payload);
      notifications.value = [created, ...notifications.value.filter((n) => n.id !== created.id)];
      total.value = notifications.value.length;
      if (created.status === 'SENT' || created.status === 'PENDING') {
        unreadCount.value += 1;
      }
      return created;
    } catch (err) {
      applyError(err, 'create');
      throw err;
    } finally {
      saving.value = false;
    }
  }

  async function markAsRead(id: string) {
    actingId.value = id;
    clearError();
    actionMessage.value = null;
    try {
      const updated = await notificationsApi.markNotificationAsRead(id);
      const wasUnread = notifications.value.find((n) => n.id === id)?.status === 'SENT';
      replaceLocal(updated);
      if (wasUnread && unreadCount.value > 0) unreadCount.value -= 1;
      return updated;
    } catch (err) {
      applyError(err, 'read');
      throw err;
    } finally {
      actingId.value = null;
    }
  }

  async function cancelNotification(id: string) {
    actingId.value = id;
    clearError();
    actionMessage.value = null;
    try {
      const updated = await notificationsApi.cancelNotification(id);
      const prev = notifications.value.find((n) => n.id === id);
      replaceLocal(updated);
      if (prev?.status === 'PENDING' && unreadCount.value > 0) unreadCount.value -= 1;
      return updated;
    } catch (err) {
      applyError(err, 'cancel');
      throw err;
    } finally {
      actingId.value = null;
    }
  }

  async function refresh(params?: NotificationListParams) {
    await fetchNotifications(params);
    await fetchUnreadCount();
  }

  return {
    notifications,
    notification,
    total,
    unreadCount,
    loading,
    saving,
    actingId,
    error,
    errorMessage,
    actionMessage,
    fetchNotifications,
    fetchUnreadCount,
    fetchNotification,
    createNotification,
    markAsRead,
    cancelNotification,
    refresh,
    clearError,
  };
}

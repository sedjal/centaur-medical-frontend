import { ref } from 'vue';
import * as notificationsApi from '../api/notifications.api';
import type { NotificationListParams } from '../api/notifications.api';
import {
  getNotificationStreamOpen,
  notificationsStreamUrl,
  type NotificationStreamHandle,
  type StreamConnectionState,
} from '../api/notifications.stream';
import type { AppNotification, NotificationCreatePayload } from '../types';
import { useApiError } from './useApiError';
import { notificationApiMessage } from '../utils/notifications';

/** Shared across Topbar + NotificationsView (no dedicated Pinia store). */
const sharedUnreadCount = ref(0);
const sharedConnectionState = ref<StreamConnectionState>('disconnected');
const sharedStreamRevision = ref(0);

let streamHandle: NotificationStreamHandle | null = null;
let streamRefCount = 0;
let intentionalClose = false;
let resyncOnNextOpen = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let unreadInflight: Promise<number> | null = null;

export const NOTIFICATION_SSE_RECONNECT_MS = 2_000;

export interface NotificationSseCreated {
  notificationId: string;
  type?: string;
  unreadCount?: number;
}

function parseCreatedPayload(raw: string): NotificationSseCreated | null {
  try {
    const data = JSON.parse(raw) as NotificationSseCreated;
    if (!data || typeof data.notificationId !== 'string') return null;
    return data;
  } catch {
    return null;
  }
}

function applyCreatedEvent(payload: NotificationSseCreated): void {
  if (typeof payload.unreadCount === 'number' && Number.isFinite(payload.unreadCount)) {
    sharedUnreadCount.value = Math.max(0, Math.floor(payload.unreadCount));
  }
  sharedStreamRevision.value += 1;
}

async function syncUnreadFromDb(): Promise<void> {
  try {
    const data = await notificationsApi.getNotifications({ read: false });
    sharedUnreadCount.value = data.total ?? (data.items || []).length;
    sharedStreamRevision.value += 1;
  } catch {
    /* REST remains usable without SSE */
  }
}

function clearReconnectTimer(): void {
  if (!reconnectTimer) return;
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

function scheduleReconnect(): void {
  if (intentionalClose || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (intentionalClose || streamHandle) return;
    openStream();
  }, NOTIFICATION_SSE_RECONNECT_MS);
}

function openStream(): void {
  if (streamHandle) return;
  const open = getNotificationStreamOpen();
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('centaur_token') : null;
  if (!open || !token) {
    sharedConnectionState.value = 'disconnected';
    return;
  }

  streamHandle = open({
    url: notificationsStreamUrl(),
    token,
    onOpen() {
      sharedConnectionState.value = 'connected';
      if (resyncOnNextOpen) {
        resyncOnNextOpen = false;
        void syncUnreadFromDb();
      }
    },
    onEvent(event, data) {
      if (event !== 'notification.created') return;
      const payload = parseCreatedPayload(data);
      if (!payload) return;
      applyCreatedEvent(payload);
    },
    onError() {
      streamHandle = null;
      sharedConnectionState.value = 'disconnected';
      if (intentionalClose) return;
      resyncOnNextOpen = true;
      scheduleReconnect();
    },
  });
}

export function connectNotificationStream(): void {
  streamRefCount += 1;
  if (streamHandle) return;

  intentionalClose = false;
  sharedConnectionState.value = 'connecting';
  openStream();
  if (!streamHandle && sharedConnectionState.value === 'connecting') {
    sharedConnectionState.value = 'disconnected';
  }
}

export function disconnectNotificationStream(): void {
  streamRefCount = Math.max(0, streamRefCount - 1);
  if (streamRefCount > 0) return;
  teardownNotificationStream();
}

export function teardownNotificationStream(): void {
  intentionalClose = true;
  streamRefCount = 0;
  resyncOnNextOpen = false;
  clearReconnectTimer();
  if (streamHandle) {
    try {
      streamHandle.close();
    } catch {
      /* ignore */
    }
  }
  streamHandle = null;
  sharedConnectionState.value = 'disconnected';
}

export function __resetNotificationStreamForTests(): void {
  teardownNotificationStream();
  sharedUnreadCount.value = 0;
  sharedStreamRevision.value = 0;
  unreadInflight = null;
  intentionalClose = false;
}

/**
 * État local notifications (pas de store Pinia métier).
 * unreadCount + SSE stream sont partagés pour le badge Topbar.
 */
export function useNotifications() {
  const notifications = ref<AppNotification[]>([]);
  const notification = ref<AppNotification | null>(null);
  const total = ref(0);
  const unreadCount = sharedUnreadCount;
  const connectionState = sharedConnectionState;
  const streamRevision = sharedStreamRevision;
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
    if (unreadInflight) return unreadInflight;
    unreadInflight = (async () => {
      try {
        const data = await notificationsApi.getNotifications({ read: false });
        unreadCount.value = data.total ?? (data.items || []).length;
        return unreadCount.value;
      } catch {
        unreadCount.value = 0;
        return 0;
      } finally {
        unreadInflight = null;
      }
    })();
    return unreadInflight;
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
    // Derive unread count from already-loaded list instead of a second API call
    const unread = notifications.value.filter(
      (n) => n.status === 'SENT' || n.status === 'PENDING'
    ).length;
    sharedUnreadCount.value = unread;
  }

  return {
    notifications,
    notification,
    total,
    unreadCount,
    connectionState,
    streamRevision,
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
    connect: connectNotificationStream,
    disconnect: disconnectNotificationStream,
    teardown: teardownNotificationStream,
    clearError,
  };
}

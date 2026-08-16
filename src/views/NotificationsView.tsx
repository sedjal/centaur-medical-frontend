import { defineComponent, onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useNotifications } from '../composables/useNotifications';
import type { NotificationListParams } from '../api/notifications.api';
import { usePatients } from '../composables/usePatients';
import * as usersApi from '../api/users.api';
import type {
  AppNotification,
  AppUser,
  NotificationCreatePayload,
  NotificationType,
} from '../types';
import {
  NOTIFICATION_TYPES,
  formatNotificationDate,
  notificationStatusLabel,
  notificationTypeLabel,
  staffDirectoryLabel,
} from '../utils/notifications';
import {
  PageHeader,
  Button,
  Select,
  EmptyState,
  ErrorState,
  Modal,
  ConfirmDialog,
} from '../components/ui';
import NotificationList from '../components/notification/NotificationList';
import NotificationForm from '../components/notification/NotificationForm';

type ReadFilter = '' | 'unread' | 'read';

export default defineComponent({
  name: 'NotificationsView',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const auth = useAuthStore();
    const canRead = computed(() => auth.hasPermission('notifications:read'));
    const canCreate = computed(() => auth.hasPermission('notifications:create'));
    const canCancel = computed(() => auth.hasPermission('notifications:cancel'));
    const canReadAll = computed(() => auth.hasPermission('notifications:read_all'));
    const canReadPatients = computed(() => auth.hasPermission('patients:read'));

    const readFilter = ref<ReadFilter>('');
    const typeFilter = ref<NotificationType | ''>('');
    const formOpen = ref(false);
    const detail = ref<AppNotification | null>(null);
    const cancelTarget = ref<AppNotification | null>(null);
    const users = ref<AppUser[]>([]);
    const loadingRecipients = ref(false);
    const successMessage = ref<string | null>(null);

    const {
      notifications,
      unreadCount,
      streamRevision,
      loading,
      saving,
      actingId,
      actionMessage,
      fetchNotifications,
      fetchUnreadCount,
      createNotification,
      markAsRead,
      cancelNotification,
    } = useNotifications();

    const { patients, fetchPatients } = usePatients();

    const currentUserId = computed(
      () => String(auth.user?.id || auth.user?.sub || '')
    );

    function labelForUser(id?: string | null): string {
      if (!id) return 'Système';
      if (id === currentUserId.value) {
        const self = auth.user;
        if (!self) return 'Vous';
        return `Vous — ${staffDirectoryLabel({
          firstName: self.firstName,
          lastName: self.lastName,
          role: self.role,
          email: self.email,
        })}`;
      }
      const found = users.value.find((u) => u.id === id);
      if (found) return staffDirectoryLabel(found);
      return 'Membre du personnel';
    }

    async function loadDirectory() {
      if (!canCreate.value && !canReadAll.value) return;
      loadingRecipients.value = true;
      try {
        users.value = (await usersApi.listStaffDirectory()) || [];
      } catch {
        users.value = [];
      } finally {
        loadingRecipients.value = false;
      }
    }

    function listParams(): NotificationListParams {
      return {
        read:
          readFilter.value === 'unread'
            ? false
            : readFilter.value === 'read'
              ? true
              : undefined,
        type: typeFilter.value || undefined,
      };
    }

    async function load() {
      if (!canRead.value) return;
      try {
        await fetchNotifications(listParams());
      } catch {
        /* actionMessage */
      }
    }

    function openFromQuery() {
      const id = route.query.open;
      if (!id || typeof id !== 'string') return;
      const found = notifications.value.find((n) => n.id === id);
      if (found) detail.value = found;
      const nextQuery = { ...route.query } as Record<string, string | string[] | undefined>;
      delete nextQuery.open;
      void router.replace({ query: nextQuery });
    }

    onMounted(() => {
      void load().then(() => openFromQuery());
      void loadDirectory();
      if (canReadPatients.value) {
        void fetchPatients().catch(() => undefined);
      }
    });

    watch(
      () => route.query.open,
      () => {
        openFromQuery();
      }
    );

    watch(streamRevision, () => {
      if (!canRead.value) return;
      void load();
    });

    const patientLabel = computed(() => {
      const map = new Map(
        patients.value.map((p) => [
          p.id,
          `${String(p.last_name || '').toUpperCase()} ${p.first_name} (${p.patient_code})`,
        ])
      );
      return (id: string) => map.get(id) || id;
    });

    async function onCreate(payload: NotificationCreatePayload) {
      try {
        await createNotification(payload);
        formOpen.value = false;
        successMessage.value = 'Notification créée.';
        await load();
      } catch {
        /* actionMessage */
      }
    }

    async function onMarkRead(id: string) {
      try {
        await markAsRead(id);
        if (detail.value?.id === id) {
          detail.value = { ...detail.value, status: 'READ', readAt: new Date().toISOString() };
        }
      } catch {
        /* actionMessage */
      }
    }

    async function confirmCancel() {
      if (!cancelTarget.value || !canCancel.value) return;
      try {
        await cancelNotification(cancelTarget.value.id);
        cancelTarget.value = null;
        detail.value = null;
        await load();
      } catch {
        cancelTarget.value = null;
      }
    }

    const unreadLabel = computed(() => {
      const n = unreadCount.value;
      if (n <= 0) return 'Non lues';
      return `Non lues (${n})`;
    });

    return () => (
      <div class="page notif-page">
        <PageHeader
          title="Notifications"
          description="Vos alertes, rappels et événements importants"
          actions={
            canRead.value ? (
              <div class="notif-header-actions">
                {unreadCount.value > 0 && (
                  <span class="notif-count-chip">{unreadCount.value} non lues</span>
                )}
                <Button
                  variant="ghost"
                  onClick={() => void load().then(() => fetchUnreadCount())}
                  disabled={loading.value}
                >
                  Actualiser
                </Button>
                {canCreate.value && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      successMessage.value = null;
                      formOpen.value = true;
                    }}
                  >
                    Nouvelle notification
                  </Button>
                )}
              </div>
            ) : undefined
          }
        />

        {!canRead.value && (
          <EmptyState
            title="Accès restreint"
            description="Vous n'avez pas l'autorisation de consulter les notifications."
          />
        )}

        {canRead.value && (
          <>
            {successMessage.value && (
              <p class="notif-success" role="status">
                {successMessage.value}
              </p>
            )}

            {actionMessage.value && !loading.value && notifications.value.length === 0 && (
              <ErrorState
                title="Impossible de charger les notifications"
                message={actionMessage.value}
                retry={() => void load()}
              />
            )}

            <div class="notif-toolbar">
              <div class="notif-pills" role="tablist" aria-label="Filtrer par lecture">
                <button
                  type="button"
                  class={readFilter.value === '' ? 'notif-pill notif-pill--active' : 'notif-pill'}
                  onClick={() => {
                    readFilter.value = '';
                    void load();
                  }}
                >
                  Toutes
                </button>
                <button
                  type="button"
                  class={
                    readFilter.value === 'unread' ? 'notif-pill notif-pill--active' : 'notif-pill'
                  }
                  onClick={() => {
                    readFilter.value = 'unread';
                    void load();
                  }}
                >
                  {unreadLabel.value}
                </button>
                <button
                  type="button"
                  class={
                    readFilter.value === 'read' ? 'notif-pill notif-pill--active' : 'notif-pill'
                  }
                  onClick={() => {
                    readFilter.value = 'read';
                    void load();
                  }}
                >
                  Lues
                </button>
              </div>
              <Select
                label="Type"
                value={typeFilter.value}
                options={NOTIFICATION_TYPES.map((t) => ({
                  value: t,
                  label: notificationTypeLabel(t),
                }))}
                placeholder="Tous les types"
                onChange={(v: string) => {
                  typeFilter.value = (v as NotificationType | '') || '';
                  void load();
                }}
              />
            </div>

            <NotificationList
              items={notifications.value}
              loading={loading.value}
              patientLabel={patientLabel.value}
              recipientLabel={canReadAll.value ? (id: string) => labelForUser(id) : undefined}
              canMarkRead={canRead.value}
              canCancel={canCancel.value}
              actingId={actingId.value}
              onMarkRead={(id: string) => void onMarkRead(id)}
              onCancel={(n: AppNotification) => {
                cancelTarget.value = n;
              }}
              onOpen={(n: AppNotification) => {
                detail.value = n;
              }}
            />
          </>
        )}

        <Modal
          open={Boolean(detail.value)}
          title="Détail de la notification"
          size="md"
          onClose={() => {
            detail.value = null;
          }}
        >
          {detail.value && (
            <div class="notif-detail">
              <div class="notif-detail__kicker">
                <span>{notificationTypeLabel(detail.value.type)}</span>
                <span class="notif-detail__dot-sep">·</span>
                <span>{notificationStatusLabel(detail.value.status)}</span>
              </div>
              <h3 class="notif-detail__title">{detail.value.title}</h3>
              <p class="notif-detail__message">{detail.value.message}</p>
              <div class="notif-detail__people">
                <p>
                  <span>Destinataire</span>
                  <strong>{labelForUser(detail.value.recipientId)}</strong>
                </p>
                <p>
                  <span>Créée par</span>
                  <strong>{labelForUser(detail.value.createdBy)}</strong>
                </p>
              </div>
              <div class="notif-detail__meta">
                {detail.value.patientId && (
                  <p>
                    <span>Patient</span>
                    {patientLabel.value(detail.value.patientId)}
                  </p>
                )}
                <p>
                  <span>Date</span>
                  {formatNotificationDate(detail.value.createdAt)}
                </p>
                {detail.value.status === 'PENDING' ? (
                  <p>
                    <span>Planifiée</span>
                    {formatNotificationDate(detail.value.scheduledAt)}
                  </p>
                ) : (
                  <p>
                    <span>Envoyée</span>
                    {formatNotificationDate(detail.value.sentAt)}
                  </p>
                )}
              </div>
              <div class="notif-detail__actions">
                {canRead.value && detail.value.status === 'SENT' && (
                  <Button
                    size="sm"
                    loading={actingId.value === detail.value.id}
                    disabled={actingId.value === detail.value.id}
                    onClick={() => void onMarkRead(detail.value!.id)}
                  >
                    Marquer comme lue
                  </Button>
                )}
                {canCancel.value && detail.value.status === 'PENDING' && (
                  <Button
                    variant="danger"
                    size="sm"
                    loading={actingId.value === detail.value.id}
                    disabled={actingId.value === detail.value.id}
                    onClick={() => {
                      cancelTarget.value = detail.value;
                    }}
                  >
                    Annuler
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal>

        <Modal
          open={formOpen.value}
          title="Nouvelle notification"
          size="md"
          onClose={() => {
            if (!saving.value) formOpen.value = false;
          }}
        >
          {formOpen.value && (
            <NotificationForm
              users={users.value}
              patients={patients.value}
              currentUserId={currentUserId.value}
              canPickPatient={canReadPatients.value}
              loadingRecipients={loadingRecipients.value}
              saving={saving.value}
              error={formOpen.value ? actionMessage.value || undefined : undefined}
              onSubmit={(payload: NotificationCreatePayload) => void onCreate(payload)}
              onCancel={() => {
                if (!saving.value) formOpen.value = false;
              }}
            />
          )}
        </Modal>

        <ConfirmDialog
          open={Boolean(cancelTarget.value)}
          title="Annuler la notification"
          message="Êtes-vous sûr de vouloir annuler cette notification planifiée ?"
          confirmLabel="Annuler la notification"
          cancelLabel="Fermer"
          danger
          loading={Boolean(actingId.value)}
          onConfirm={() => void confirmCancel()}
          onCancel={() => {
            cancelTarget.value = null;
          }}
        />
      </div>
    );
  },
});

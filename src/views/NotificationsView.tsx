import { defineComponent, onMounted, ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useNotifications } from '../composables/useNotifications';
import { usePatients } from '../composables/usePatients';
import * as usersApi from '../api/users.api';
import type { AppNotification, AppUser, NotificationCreatePayload, NotificationStatus, NotificationType } from '../types';
import {
  NOTIFICATION_TYPES,
  formatNotificationDate,
  notificationStatusLabel,
  notificationTypeLabel,
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
import NotificationCard from '../components/notification/NotificationCard';

type ReadFilter = '' | 'unread' | 'read';

export default defineComponent({
  name: 'NotificationsView',
  setup() {
    const auth = useAuthStore();
    const canRead = computed(() => auth.hasPermission('notifications:read'));
    const canCreate = computed(() => auth.hasPermission('notifications:create'));
    const canCancel = computed(() => auth.hasPermission('notifications:cancel'));
    const canReadUsers = computed(() => auth.hasPermission('users:read'));
    const canReadPatients = computed(() => auth.hasPermission('patients:read'));

    const readFilter = ref<ReadFilter>('');
    const statusFilter = ref<NotificationStatus | ''>('');
    const typeFilter = ref<NotificationType | ''>('');
    const formOpen = ref(false);
    const detail = ref<AppNotification | null>(null);
    const cancelTarget = ref<AppNotification | null>(null);
    const users = ref<AppUser[]>([]);
    const successMessage = ref<string | null>(null);

    const {
      notifications,
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

    async function load() {
      if (!canRead.value) return;
      try {
        await fetchNotifications({
          read:
            readFilter.value === 'unread'
              ? false
              : readFilter.value === 'read'
                ? true
                : undefined,
          status: statusFilter.value || undefined,
          type: typeFilter.value || undefined,
        });
        await fetchUnreadCount();
      } catch {
        /* actionMessage */
      }
    }

    onMounted(() => {
      void load();
      if (canReadPatients.value) {
        void fetchPatients().catch(() => undefined);
      }
      if (canReadUsers.value) {
        void usersApi
          .listUsers()
          .then((list) => {
            users.value = list || [];
          })
          .catch(() => undefined);
      }
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
        await fetchUnreadCount();
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

    return () => (
      <div class="page">
        <PageHeader
          title="Notifications"
          description="Consultez et gérez vos notifications."
          actions={
            canRead.value ? (
              <div class="notif-header-actions">
                <Button variant="ghost" onClick={() => void load()} disabled={loading.value}>
                  Actualiser
                </Button>
                {canCreate.value && (
                  <Button
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

            <div class="toolbar">
              <Select
                label="Lecture"
                value={readFilter.value}
                options={[
                  { value: 'unread', label: 'Non lues' },
                  { value: 'read', label: 'Lues' },
                ]}
                placeholder="Toutes"
                onChange={(v: string) => {
                  readFilter.value = (v as ReadFilter) || '';
                  void load();
                }}
              />
              <Select
                label="Statut"
                value={statusFilter.value}
                options={[
                  { value: 'PENDING', label: 'Planifiée' },
                  { value: 'SENT', label: 'Envoyée' },
                  { value: 'READ', label: 'Lue' },
                  { value: 'CANCELLED', label: 'Annulée' },
                ]}
                placeholder="Tous les statuts"
                onChange={(v: string) => {
                  statusFilter.value = (v as NotificationStatus | '') || '';
                  void load();
                }}
              />
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
          title="Notification"
          size="md"
          onClose={() => {
            detail.value = null;
          }}
        >
          {detail.value && (
            <div class="notif-detail">
              <NotificationCard
                notification={detail.value}
                patientLabel={
                  detail.value.patientId
                    ? patientLabel.value(detail.value.patientId)
                    : undefined
                }
                canMarkRead={canRead.value}
                canCancel={canCancel.value}
                acting={actingId.value === detail.value.id}
                onMarkRead={() => void onMarkRead(detail.value!.id)}
                onCancel={() => {
                  cancelTarget.value = detail.value;
                }}
              />
              <p class="notif-detail__meta">
                Type : {notificationTypeLabel(detail.value.type)} · Statut :{' '}
                {notificationStatusLabel(detail.value.status)}
                <br />
                Créée le {formatNotificationDate(detail.value.createdAt)}
              </p>
            </div>
          )}
        </Modal>

        <Modal
          open={formOpen.value}
          title="Nouvelle notification"
          size="lg"
          onClose={() => {
            if (!saving.value) formOpen.value = false;
          }}
        >
          {currentUserId.value ? (
            <NotificationForm
              defaultRecipientId={currentUserId.value}
              users={users.value}
              patients={patients.value}
              canPickRecipient={canReadUsers.value}
              canPickPatient={canReadPatients.value}
              saving={saving.value}
              error={formOpen.value ? actionMessage.value || undefined : undefined}
              onSubmit={(payload: NotificationCreatePayload) => void onCreate(payload)}
              onCancel={() => {
                if (!saving.value) formOpen.value = false;
              }}
            />
          ) : (
            <EmptyState
              title="Session invalide"
              description="Impossible de déterminer l'utilisateur connecté."
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

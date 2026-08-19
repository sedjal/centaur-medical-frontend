import { defineComponent, onMounted, ref, computed, watch } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { usePrescriptions } from '../../composables/usePrescriptions';
import type { Prescription, PrescriptionCreatePayload } from '../../types';
import { formatDate } from '../../utils/permissions';
import { prescriptionTitle } from '../../utils/prescriptions';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  LoadingState,
  ErrorState,
  Modal,
  ConfirmDialog,
  Badge,
  type BadgeVariant,
  type DataTableColumn,
} from '../ui';
import { CmIcon } from '../ui/icons';
import PrescriptionCard from './PrescriptionCard';
import PrescriptionForm from './PrescriptionForm';

function statusVariant(status: string): BadgeVariant {
  return status === 'ACTIVE' ? 'success' : 'warning';
}

function statusLabel(status: string): string {
  return status === 'CANCELLED' ? 'Annulée' : 'Active';
}

export default defineComponent({
  name: 'PatientPrescriptions',
  props: {
    patientId: { type: String, required: true },
  },
  setup(props) {
    const auth = useAuthStore();
    const canRead = computed(() => auth.hasPermission('prescriptions:read'));
    const canCreate = computed(() => auth.hasPermission('prescriptions:create'));
    const canCancel = computed(() => auth.hasPermission('prescriptions:cancel'));

    const formOpen = ref(false);
    const detail = ref<Prescription | null>(null);
    const cancelTarget = ref<Prescription | null>(null);
    const successMessage = ref<string | null>(null);

    const {
      prescriptions,
      loading,
      saving,
      cancellingId,
      actionMessage,
      fetchPatientPrescriptions,
      createPrescription,
      cancelPrescription,
    } = usePrescriptions();

    async function load() {
      if (!canRead.value || !props.patientId) return;
      try {
        await fetchPatientPrescriptions(props.patientId);
      } catch {
        /* actionMessage set by composable */
      }
    }

    onMounted(() => {
      void load();
    });

    watch(
      () => props.patientId,
      () => {
        void load();
      }
    );

    async function onCreate(payload: PrescriptionCreatePayload) {
      try {
        await createPrescription(payload);
        formOpen.value = false;
        successMessage.value = 'Ordonnance créée.';
        await load();
      } catch {
        /* actionMessage */
      }
    }

    function submitCreate(payload: PrescriptionCreatePayload) {
      void onCreate(payload);
    }

    async function confirmCancel() {
      if (!cancelTarget.value || !canCancel.value) return;
      const id = cancelTarget.value.id;
      try {
        await cancelPrescription(id);
        cancelTarget.value = null;
        if (detail.value?.id === id) detail.value = null;
        await load();
      } catch {
        cancelTarget.value = null;
      }
    }

    const visible = computed(() =>
      prescriptions.value.filter((rx) => (rx.medications || []).some((m) => m && m.name))
    );

    const columns = computed<DataTableColumn<Prescription>[]>(() => [
      {
        key: 'prescribedAt',
        label: 'Date',
        render: (row) => formatDate(row.prescribedAt),
      },
      {
        key: 'title',
        label: 'Titre',
        render: (row) => prescriptionTitle(row),
      },
      {
        key: 'status',
        label: 'Statut',
        render: (row) => (
          <Badge variant={statusVariant(row.status)}>
            {row.status === 'ACTIVE' ? <span class="cm-badge__dot" /> : null}
            {statusLabel(row.status)}
          </Badge>
        ),
      },
      {
        key: 'doctorName',
        label: 'Médecin',
        render: (row) => (row.doctorName ? `Dr ${row.doctorName}` : '—'),
      },
      {
        key: 'actions',
        label: 'Actions',
        className: 'col-actions',
        render: (row) => (
          <div class="row-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                detail.value = row;
              }}
            >
              <span class="btn-with-icon">
                <CmIcon name="eye" size={14} /> Voir
              </span>
            </Button>
            {canCancel.value && row.status === 'ACTIVE' && (
              <Button
                variant="danger"
                size="sm"
                loading={cancellingId.value === row.id}
                disabled={cancellingId.value === row.id}
                onClick={() => {
                  cancelTarget.value = row;
                }}
              >
                <span class="btn-with-icon">
                  <CmIcon name="trash" size={14} /> Annuler
                </span>
              </Button>
            )}
          </div>
        ),
      },
    ]);

    return () => (
      <div class="prescriptions-section">
        {!canRead.value && (
          <Card title="Ordonnances" icon="clipboard" padding="none">
            <EmptyState
              title="Accès restreint"
              description="Vous n'avez pas l'autorisation de consulter les ordonnances."
              icon="clipboard"
            />
          </Card>
        )}

        {canRead.value && (
          <Card
            title="Ordonnances"
            icon="clipboard"
            padding="none"
            actions={
              canCreate.value ? (
                <Button
                  size="sm"
                  onClick={() => {
                    successMessage.value = null;
                    formOpen.value = true;
                  }}
                >
                  + Nouvelle ordonnance
                </Button>
              ) : undefined
            }
          >
            {loading.value && visible.value.length === 0 && (
              <div class="dossier-panel__alerts">
                <LoadingState message="Chargement des ordonnances…" />
              </div>
            )}

            {!loading.value && actionMessage.value && visible.value.length === 0 && (
              <div class="dossier-panel__alerts">
                <ErrorState
                  title="Impossible de charger les ordonnances"
                  message={actionMessage.value}
                  retry={() => void load()}
                />
              </div>
            )}

            {successMessage.value && (
              <p class="rx-success dossier-panel__alerts" role="status">
                {successMessage.value}
              </p>
            )}

            {!(loading.value && visible.value.length === 0) &&
              !(actionMessage.value && visible.value.length === 0) && (
                <DataTable
                  columns={columns.value}
                  rows={visible.value}
                  rowKey="id"
                  emptyTitle="Aucune ordonnance"
                  emptyDescription="Ce patient ne possède aucune ordonnance enregistrée."
                />
              )}
          </Card>
        )}

        <Modal
          open={Boolean(detail.value)}
          title={detail.value ? prescriptionTitle(detail.value) : 'Ordonnance'}
          size="lg"
          onClose={() => {
            detail.value = null;
          }}
        >
          {detail.value && (
            <PrescriptionCard
              prescription={detail.value}
              canCancel={canCancel.value}
              cancelling={cancellingId.value === detail.value.id}
              onCancel={() => {
                cancelTarget.value = detail.value;
              }}
            />
          )}
        </Modal>

        <Modal
          open={formOpen.value}
          title="Nouvelle ordonnance"
          size="lg"
          onClose={() => {
            if (!saving.value) formOpen.value = false;
          }}
        >
          <PrescriptionForm
            patientId={props.patientId}
            saving={saving.value}
            error={formOpen.value ? actionMessage.value || undefined : undefined}
            onSubmit={submitCreate}
            onCancel={() => {
              if (!saving.value) formOpen.value = false;
            }}
          />
        </Modal>

        <ConfirmDialog
          open={Boolean(cancelTarget.value)}
          title="Annuler l'ordonnance"
          message="Êtes-vous sûr de vouloir annuler cette ordonnance ?"
          confirmLabel="Annuler l'ordonnance"
          cancelLabel="Fermer"
          danger
          loading={Boolean(cancellingId.value)}
          onConfirm={() => void confirmCancel()}
          onCancel={() => {
            cancelTarget.value = null;
          }}
        />
      </div>
    );
  },
});

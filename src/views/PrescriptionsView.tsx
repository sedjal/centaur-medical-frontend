import { defineComponent, onMounted, ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { usePrescriptions } from '../composables/usePrescriptions';
import { usePatients } from '../composables/usePatients';
import type { Prescription, PrescriptionCreatePayload, PrescriptionStatus } from '../types';
import { formatPrescriptionDate } from '../utils/prescriptions';
import { allowedHospitalServices, serviceLabel } from '../utils/permissions';
import {
  PageHeader,
  Card,
  Badge,
  Button,
  Select,
  DataTable,
  EmptyState,
  LoadingState,
  ErrorState,
  Modal,
  ConfirmDialog,
  Pagination,
  type DataTableColumn,
  type BadgeVariant,
} from '../components/ui';
import { CmIcon } from '../components/ui/icons';
import PrescriptionCard from '../components/prescription/PrescriptionCard';
import PrescriptionForm from '../components/prescription/PrescriptionForm';

function statusVariant(status: string): BadgeVariant {
  return status === 'ACTIVE' ? 'success' : 'warning';
}

function statusLabel(status: string): string {
  return status === 'CANCELLED' ? 'Annulée' : 'Active';
}

export default defineComponent({
  name: 'PrescriptionsView',
  setup() {
    const auth = useAuthStore();
    const canRead = computed(() => auth.hasPermission('prescriptions:read'));
    const canCreate = computed(() => auth.hasPermission('prescriptions:create'));
    const canCancel = computed(() => auth.hasPermission('prescriptions:cancel'));
    const canReadPatients = computed(() => auth.hasPermission('patients:read'));
    const allowedServices = computed(() => allowedHospitalServices(auth.user?.permissions));

    const statusFilter = ref<PrescriptionStatus | ''>('');
    const serviceFilter = ref('');
    const formOpen = ref(false);
    const createPatientId = ref('');
    const detail = ref<Prescription | null>(null);
    const cancelTarget = ref<Prescription | null>(null);
    const successMessage = ref<string | null>(null);

    const {
      prescriptions,
      loading,
      saving,
      cancellingId,
      actionMessage,
      totalPrescriptions,
      currentPage,
      pageLimit,
      fetchPrescriptions,
      createPrescription,
      cancelPrescription,
      goToPage,
    } = usePrescriptions();

    const { patients, fetchPatients } = usePatients();

    async function load() {
      if (!canRead.value) return;
      try {
        await fetchPrescriptions({
          status: statusFilter.value || undefined,
          service: serviceFilter.value || undefined,
        });
      } catch {
        /* actionMessage */
      }
    }

    onMounted(() => {
      void load();
      if (canReadPatients.value) {
        void fetchPatients().catch(() => undefined);
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

    const patientOptions = computed(() =>
      patients.value.map((p) => ({
        value: p.id,
        label: `${String(p.last_name || '').toUpperCase()} ${p.first_name} — ${p.patient_code}`,
      }))
    );

    const visible = computed(() =>
      prescriptions.value.filter((rx) => (rx.medications || []).some((m) => m && m.name))
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
      try {
        await cancelPrescription(cancelTarget.value.id);
        cancelTarget.value = null;
        detail.value = null;
        await load();
      } catch {
        cancelTarget.value = null;
      }
    }

    const columns = computed<DataTableColumn<Prescription>[]>(() => [
      {
        key: 'prescribedAt',
        label: 'Date',
        render: (row) => formatPrescriptionDate(row.prescribedAt),
      },
      {
        key: 'patientId',
        label: 'Patient',
        render: (row) => patientLabel.value(row.patientId),
      },
      {
        key: 'doctorName',
        label: 'Médecin',
        render: (row) => row.doctorName || '—',
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
        key: 'medications',
        label: 'Médicaments',
        render: (row) => String((row.medications || []).length),
      },
      {
        key: 'actions',
        label: 'Actions',
        className: 'col-actions',
        render: (row) => (
          <div class="row-actions">
            <Button variant="outline" size="sm" onClick={() => (detail.value = row)}>
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
      <div class="page">
        <PageHeader
          title="Prescriptions"
          description="Ordonnances médicales"
          actions={
            canRead.value && canCreate.value && canReadPatients.value ? (
              <Button
                onClick={() => {
                  successMessage.value = null;
                  createPatientId.value = patients.value[0]?.id || '';
                  formOpen.value = true;
                }}
              >
                + Nouvelle ordonnance
              </Button>
            ) : undefined
          }
        />

        {!canRead.value && (
          <EmptyState
            title="Accès restreint"
            description="Vous n'avez pas l'autorisation de consulter les ordonnances."
          />
        )}

        {canRead.value && (
          <>
            {successMessage.value && (
              <p class="rx-success" role="status">
                {successMessage.value}
              </p>
            )}

            {actionMessage.value && !loading.value && visible.value.length === 0 && (
              <ErrorState
                title="Impossible de charger les ordonnances"
                message={actionMessage.value}
                retry={() => void load()}
              />
            )}

            <div class="toolbar">
              <Select
                label="Statut"
                value={statusFilter.value}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'CANCELLED', label: 'Annulée' },
                ]}
                placeholder="Tous les statuts"
                onChange={(v: string) => {
                  statusFilter.value = (v as PrescriptionStatus | '') || '';
                  void load();
                }}
              />
              {allowedServices.value.length > 1 && (
                <Select
                  label="Service"
                  value={serviceFilter.value}
                  options={allowedServices.value.map((s) => ({
                    value: s,
                    label: serviceLabel(s),
                  }))}
                  placeholder="Tous les services"
                  onChange={(v: string) => {
                    serviceFilter.value = v;
                    void load();
                  }}
                />
              )}
            </div>

            {loading.value && visible.value.length === 0 ? (
              <LoadingState message="Chargement des ordonnances…" />
            ) : (
              <Card padding="none">
                <DataTable
                  columns={columns.value}
                  rows={visible.value}
                  rowKey="id"
                  emptyTitle="Aucune ordonnance"
                  emptyDescription="Aucune ordonnance enregistrée dans votre périmètre."
                />
                <Pagination
                  page={currentPage.value}
                  limit={pageLimit.value}
                  total={totalPrescriptions.value}
                  onPageChange={(p: number) => void goToPage(p)}
                />
              </Card>
            )}
          </>
        )}

        <Modal
          open={Boolean(detail.value)}
          title="Ordonnance"
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
          {patientOptions.value.length === 0 ? (
            <EmptyState
              title="Aucun patient"
              description="Aucun patient n'est disponible pour créer une ordonnance."
            />
          ) : (
            <>
              <Select
                label="Patient"
                required
                value={createPatientId.value}
                options={patientOptions.value}
                onChange={(v: string) => {
                  createPatientId.value = v;
                }}
              />
              {createPatientId.value && (
                <PrescriptionForm
                  patientId={createPatientId.value}
                  saving={saving.value}
                  error={formOpen.value ? actionMessage.value || undefined : undefined}
                  onSubmit={submitCreate}
                  onCancel={() => {
                    if (!saving.value) formOpen.value = false;
                  }}
                />
              )}
            </>
          )}
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

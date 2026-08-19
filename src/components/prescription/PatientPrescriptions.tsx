import { defineComponent, onMounted, ref, computed, watch, createApp, type PropType } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { usePrescriptions } from '../../composables/usePrescriptions';
import type { Prescription, PrescriptionCreatePayload, Patient } from '../../types';
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
import PrescriptionPrint from './PrescriptionPrint';

function statusVariant(status: string): BadgeVariant {
  return status === 'ACTIVE' ? 'success' : 'warning';
}

function statusLabel(status: string): string {
  return status === 'CANCELLED' ? 'Annulée' : 'Active';
}

function printPrescription(rx: Prescription, patient: Patient | null, rxNum: number) {
  const wrapper = document.createElement('div');
  wrapper.className = 'rx-print-wrapper';
  document.body.appendChild(wrapper);

  const app = createApp(PrescriptionPrint, { prescription: rx, patient, prescriptionNumber: rxNum });
  app.mount(wrapper);

  requestAnimationFrame(() => {
    window.print();
    setTimeout(() => {
      app.unmount();
      document.body.removeChild(wrapper);
    }, 500);
  });
}

function downloadPrescriptionPDF(rx: Prescription, patient: Patient | null, rxNum: number) {
  const wrapper = document.createElement('div');
  wrapper.className = 'rx-print-wrapper rx-pdf-download';
  document.body.appendChild(wrapper);

  const app = createApp(PrescriptionPrint, { prescription: rx, patient, prescriptionNumber: rxNum });
  app.mount(wrapper);

  const runHtml2Pdf = () => {
    const element = wrapper.querySelector('.rx-print-page');
    if (!element) {
      app.unmount();
      document.body.removeChild(wrapper);
      return;
    }
    const opt = {
      margin:       0,
      filename:     `Ordonnance_${patient?.last_name || 'Patient'}_${rx.id.slice(0, 8)}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    // @ts-ignore
    window.html2pdf().set(opt).from(element).save().then(() => {
      app.unmount();
      document.body.removeChild(wrapper);
    }).catch((err: any) => {
      console.error(err);
      app.unmount();
      document.body.removeChild(wrapper);
    });
  };

  // @ts-ignore
  if (window.html2pdf) {
    runHtml2Pdf();
  } else {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = runHtml2Pdf;
    document.head.appendChild(script);
  }
}

export default defineComponent({
  name: 'PatientPrescriptions',
  props: {
    patientId: { type: String, required: true },
    patient: { type: Object as PropType<Patient | null>, default: null },
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
      allPrescriptions: prescriptions,
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

    // Reload if permissions were not yet available at mount time
    watch(canRead, (val) => {
      if (val && prescriptions.value.length === 0 && !loading.value) {
        void load();
      }
    });

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

    // Show all prescriptions — medications may be empty for old records
    const visible = computed(() => prescriptions.value);

    const getSequentialNumber = (rxId: string) => {
      const sorted = [...visible.value].sort(
        (a, b) => new Date(a.prescribedAt).getTime() - new Date(b.prescribedAt).getTime()
      );
      const index = sorted.findIndex((r) => r.id === rxId);
      return index !== -1 ? index + 1 : 1;
    };

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
              title="Voir les détails"
            >
              <CmIcon name="eye" size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              title="Imprimer directement"
              onClick={() => printPrescription(row, props.patient, getSequentialNumber(row.id))}
            >
              <CmIcon name="print" size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              title="Télécharger en PDF"
              onClick={() => downloadPrescriptionPDF(row, props.patient, getSequentialNumber(row.id))}
            >
              <CmIcon name="download" size={14} />
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
                title="Annuler l'ordonnance"
              >
                <CmIcon name="trash" size={14} />
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
          title={
            detail.value
              ? `${prescriptionTitle(detail.value)} (N° OR-${String(
                  detail.value.prescriptionNumber || getSequentialNumber(detail.value.id)
                ).padStart(4, '0')})`
              : 'Ordonnance'
          }
          size="lg"
          onClose={() => {
            detail.value = null;
          }}
        >
          {detail.value && (
            <>
              <div class="rx-modal-print-bar">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    printPrescription(detail.value!, props.patient, getSequentialNumber(detail.value!.id))
                  }
                >
                  <span class="btn-with-icon">
                    <CmIcon name="print" size={14} /> Imprimer
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadPrescriptionPDF(
                      detail.value!,
                      props.patient,
                      getSequentialNumber(detail.value!.id)
                    )
                  }
                >
                  <span class="btn-with-icon">
                    <CmIcon name="download" size={14} /> Télécharger
                  </span>
                </Button>
              </div>
              <PrescriptionCard
                prescription={detail.value}
                canCancel={canCancel.value}
                cancelling={cancellingId.value === detail.value.id}
                onCancel={() => {
                  cancelTarget.value = detail.value;
                }}
              />
            </>
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
            patient={props.patient}
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

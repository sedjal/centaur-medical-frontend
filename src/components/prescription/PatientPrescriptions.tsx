import { defineComponent, onMounted, ref, computed, watch } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { usePrescriptions } from '../../composables/usePrescriptions';
import type { Prescription, PrescriptionCreatePayload } from '../../types';
import {
  Button,
  EmptyState,
  LoadingState,
  ErrorState,
  Modal,
  ConfirmDialog,
} from '../ui';
import PrescriptionCard from './PrescriptionCard';
import PrescriptionForm from './PrescriptionForm';

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
        await load();
      } catch {
        cancelTarget.value = null;
      }
    }

    const visible = computed(() =>
      prescriptions.value.filter((rx) => (rx.medications || []).some((m) => m && m.name))
    );

    return () => (
      <div class="prescriptions-section">
        <div class="section-head">
          <h2>Ordonnances</h2>
          {canRead.value && canCreate.value && (
            <Button
              size="sm"
              onClick={() => {
                successMessage.value = null;
                formOpen.value = true;
              }}
            >
              Nouvelle ordonnance
            </Button>
          )}
        </div>

        {!canRead.value && (
          <EmptyState
            title="Accès restreint"
            description="Vous n'avez pas l'autorisation de consulter les ordonnances."
          />
        )}

        {canRead.value && loading.value && visible.value.length === 0 && (
          <LoadingState message="Chargement des ordonnances…" />
        )}

        {canRead.value && !loading.value && actionMessage.value && visible.value.length === 0 && (
          <ErrorState
            title="Impossible de charger les ordonnances"
            message={actionMessage.value}
            retry={() => void load()}
          />
        )}

        {canRead.value && successMessage.value && (
          <p class="rx-success" role="status">
            {successMessage.value}
          </p>
        )}

        {canRead.value && !loading.value && !actionMessage.value && visible.value.length === 0 && (
          <EmptyState
            title="Aucune ordonnance"
            description="Ce patient ne possède aucune ordonnance enregistrée."
          />
        )}

        {canRead.value && visible.value.length > 0 && (
          <div class="rx-list">
            {visible.value.map((rx) => (
              <PrescriptionCard
                key={rx.id}
                prescription={rx}
                canCancel={canCancel.value}
                cancelling={cancellingId.value === rx.id}
                onCancel={() => {
                  cancelTarget.value = rx;
                }}
              />
            ))}
          </div>
        )}

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

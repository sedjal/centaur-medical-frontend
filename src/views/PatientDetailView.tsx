import { defineComponent, onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { usePatients } from '../composables/usePatients';
import PatientHeader from '../components/patient/PatientHeader';
import PatientInfoCard from '../components/patient/PatientInfoCard';
import MedicalRecordCard from '../components/patient/MedicalRecordCard';
import PatientDocuments from '../components/document/PatientDocuments';
import PatientClinicalNotes from '../components/clinical-note/PatientClinicalNotes';
import PatientPrescriptions from '../components/prescription/PatientPrescriptions';
import PatientMedicalHistory from '../components/history/PatientMedicalHistory';
import { LoadingState, ErrorState, ConfirmDialog } from '../components/ui';

type DetailTab = 'informations' | 'dossier' | 'ordonnances';

export default defineComponent({
  name: 'PatientDetailView',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const auth = useAuthStore();
    const tab = ref<DetailTab>('dossier');
    const deleteOpen = ref(false);
    const deleting = ref(false);

    const { patient, loading, error, errorMessage, fetchPatient, deletePatient } = usePatients();

    const canUpdate = computed(() => auth.hasPermission('patients:update'));
    const canDelete = computed(() => auth.hasPermission('patients:delete'));

    const patientId = computed(() => String(route.params.id || ''));

    const detailErrorTitle = computed(() => {
      const status = error.value?.status;
      if (status === 404) return 'Patient introuvable';
      if (status === 403) return 'Accès refusé';
      return 'Impossible de charger le dossier médical';
    });

    const detailErrorMessage = computed(() => {
      const status = error.value?.status;
      if (status === 404) return 'Patient introuvable.';
      if (status === 403) return "Vous n'avez pas l'autorisation de consulter ce dossier.";
      return errorMessage.value || 'Impossible de charger le dossier médical.';
    });

    async function load() {
      if (!patientId.value) return;
      try {
        await fetchPatient(patientId.value);
      } catch {
        /* error set by composable */
      }
    }

    onMounted(() => {
      void load();
    });

    watch(patientId, () => {
      void load();
    });

    async function confirmDelete() {
      if (!canDelete.value || !patient.value) return;
      deleting.value = true;
      try {
        await deletePatient(patient.value.id);
        deleteOpen.value = false;
        await router.push({ name: 'patients' });
      } catch {
        deleteOpen.value = false;
      } finally {
        deleting.value = false;
      }
    }

    return () => (
      <div class="page patient-detail-page">
        {loading.value && !patient.value && (
          <LoadingState message="Chargement du dossier patient…" />
        )}

        {!loading.value && error.value && !patient.value && (
          <ErrorState
            title={detailErrorTitle.value}
            message={detailErrorMessage.value}
            retry={() => void load()}
          />
        )}

        {patient.value && (
          <>
            <PatientHeader
              patient={patient.value}
              canUpdate={canUpdate.value}
              canDelete={canDelete.value}
              onBack={() => router.push({ name: 'patients' })}
              onEdit={() =>
                router.push({ name: 'patient-edit', params: { id: patient.value!.id } })
              }
              onDelete={() => {
                deleteOpen.value = true;
              }}
            />

            <div class="patient-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                class={`patient-tab ${tab.value === 'informations' ? 'active' : ''}`}
                aria-selected={tab.value === 'informations'}
                onClick={() => {
                  tab.value = 'informations';
                }}
              >
                Informations
              </button>
              <button
                type="button"
                role="tab"
                class={`patient-tab ${tab.value === 'dossier' ? 'active' : ''}`}
                aria-selected={tab.value === 'dossier'}
                onClick={() => {
                  tab.value = 'dossier';
                }}
              >
                Dossier médical
              </button>
              <button
                type="button"
                role="tab"
                class={`patient-tab ${tab.value === 'ordonnances' ? 'active' : ''}`}
                aria-selected={tab.value === 'ordonnances'}
                onClick={() => {
                  tab.value = 'ordonnances';
                }}
              >
                Ordonnances
              </button>
            </div>

            <div class="patient-detail-grid">
              {tab.value === 'informations' && <PatientInfoCard patient={patient.value} />}
              {tab.value === 'dossier' && (
                <>
                  <div class="dossier-split">
                    <PatientDocuments patientId={patient.value.id} />
                    <PatientMedicalHistory patientId={patient.value.id} />
                  </div>
                  <div class="dossier-split">
                    <PatientClinicalNotes patientId={patient.value.id} />
                    <MedicalRecordCard patient={patient.value} />
                  </div>
                </>
              )}
              {tab.value === 'ordonnances' && (
                <PatientPrescriptions patientId={patient.value.id} patient={patient.value} />
              )}
            </div>
          </>
        )}

        <ConfirmDialog
          open={deleteOpen.value}
          title="Supprimer le patient"
          message="Êtes-vous sûr de vouloir supprimer ce patient ?"
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          danger
          loading={deleting.value}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            deleteOpen.value = false;
          }}
        />
      </div>
    );
  },
});

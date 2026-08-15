import { defineComponent, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useMedicalHistory } from '../../composables/useMedicalHistory';
import { EmptyState, LoadingState, ErrorState } from '../ui';
import HistoryEventCard from './HistoryEventCard';

export default defineComponent({
  name: 'PatientMedicalHistory',
  props: {
    patientId: { type: String, required: true },
  },
  setup(props) {
    const auth = useAuthStore();
    const canRead = computed(() => auth.hasPermission('medical_history:read'));

    const { items, loading, actionMessage, fetchPatientMedicalHistory } = useMedicalHistory();

    async function load() {
      if (!canRead.value || !props.patientId) return;
      try {
        await fetchPatientMedicalHistory(props.patientId);
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

    return () => (
      <div class="medical-history-section">
        <div class="section-head">
          <h2>Historique médical</h2>
        </div>

        {!canRead.value && (
          <EmptyState
            title="Accès restreint"
            description="Vous n'avez pas l'autorisation de consulter l'historique médical."
          />
        )}

        {canRead.value && loading.value && items.value.length === 0 && (
          <LoadingState message="Chargement de l'historique médical…" />
        )}

        {canRead.value && !loading.value && actionMessage.value && items.value.length === 0 && (
          <ErrorState
            title="Impossible de charger l'historique"
            message={actionMessage.value}
            retry={() => void load()}
          />
        )}

        {canRead.value && !loading.value && !actionMessage.value && items.value.length === 0 && (
          <EmptyState
            title="Aucun événement"
            description="Aucun événement médical enregistré pour ce patient."
          />
        )}

        {canRead.value && items.value.length > 0 && (
          <div class="mh-list">
            {items.value.map((ev) => (
              <HistoryEventCard key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </div>
    );
  },
});

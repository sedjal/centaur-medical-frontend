import { defineComponent, onMounted, ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useMedicalHistory } from '../composables/useMedicalHistory';
import type { MedicalHistoryEventType, MedicalHistoryItem } from '../types';
import {
  MEDICAL_HISTORY_EVENT_TYPES,
  dateInputToIso,
  formatMedicalHistoryDate,
  medicalHistoryEventLabel,
  medicalHistoryEventVariant,
  medicalHistoryMetadataLabel,
} from '../utils/medicalHistory';
import { allowedHospitalServices, serviceLabel } from '../utils/permissions';
import {
  PageHeader,
  Card,
  Badge,
  Select,
  Input,
  DataTable,
  EmptyState,
  LoadingState,
  ErrorState,
  type DataTableColumn,
} from '../components/ui';

export default defineComponent({
  name: 'HistoryView',
  setup() {
    const auth = useAuthStore();
    const canRead = computed(() => auth.hasPermission('medical_history:read'));
    const allowedServices = computed(() => allowedHospitalServices(auth.user?.permissions));

    const typeFilter = ref<MedicalHistoryEventType | ''>('');
    const serviceFilter = ref('');
    const fromFilter = ref('');
    const toFilter = ref('');

    const { items, total, loading, actionMessage, fetchMedicalHistory } = useMedicalHistory();

    async function load() {
      if (!canRead.value) return;
      try {
        await fetchMedicalHistory({
          type: typeFilter.value || undefined,
          service: serviceFilter.value || undefined,
          from: dateInputToIso(fromFilter.value, false),
          to: dateInputToIso(toFilter.value, true),
        });
      } catch {
        /* actionMessage */
      }
    }

    onMounted(() => {
      void load();
    });

    const columns = computed<DataTableColumn<MedicalHistoryItem>[]>(() => [
      {
        key: 'occurredAt',
        label: 'Date',
        render: (row) => formatMedicalHistoryDate(row.occurredAt),
      },
      {
        key: 'eventType',
        label: 'Type',
        render: (row) => (
          <Badge variant={medicalHistoryEventVariant(row.eventType)}>
            {medicalHistoryEventLabel(row.eventType)}
          </Badge>
        ),
      },
      {
        key: 'summary',
        label: 'Événement',
        render: (row) => (
          <div class="mh-cell-summary">
            <strong>{row.summary}</strong>
            {medicalHistoryMetadataLabel(row.metadata) ? (
              <span class="mh-cell-meta">{medicalHistoryMetadataLabel(row.metadata)}</span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'service',
        label: 'Service',
        render: (row) => serviceLabel(row.service),
      },
      {
        key: 'doctorName',
        label: 'Médecin',
        render: (row) => row.doctorName || '—',
      },
    ]);

    return () => (
      <div class="page">
        <PageHeader
          title="Historique médical"
          description="Chronologie des événements médicaux par patient et service."
        />

        {!canRead.value && (
          <EmptyState
            title="Accès restreint"
            description="Vous n'avez pas l'autorisation de consulter l'historique médical."
          />
        )}

        {canRead.value && (
          <>
            {actionMessage.value && !loading.value && items.value.length === 0 && (
              <ErrorState
                title="Impossible de charger l'historique"
                message={actionMessage.value}
                retry={() => void load()}
              />
            )}

            <div class="toolbar">
              <Select
                label="Type"
                value={typeFilter.value}
                options={MEDICAL_HISTORY_EVENT_TYPES.map((t) => ({
                  value: t,
                  label: medicalHistoryEventLabel(t),
                }))}
                placeholder="Tous les types"
                onChange={(v: string) => {
                  typeFilter.value = (v as MedicalHistoryEventType | '') || '';
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
              <Input
                label="Du"
                type="date"
                value={fromFilter.value}
                onInput={(v: string) => {
                  fromFilter.value = v;
                  void load();
                }}
              />
              <Input
                label="Au"
                type="date"
                value={toFilter.value}
                onInput={(v: string) => {
                  toFilter.value = v;
                  void load();
                }}
              />
            </div>

            {!loading.value && items.value.length > 0 && (
              <p class="mh-total" role="status">
                {total.value} événement{total.value > 1 ? 's' : ''}
              </p>
            )}

            {loading.value && items.value.length === 0 ? (
              <LoadingState message="Chargement de l'historique médical…" />
            ) : (
              <Card padding="none">
                <DataTable
                  columns={columns.value}
                  rows={items.value}
                  rowKey="id"
                  emptyTitle="Aucun événement"
                  emptyDescription="Aucun événement médical dans votre périmètre pour ces filtres."
                />
              </Card>
            )}
          </>
        )}
      </div>
    );
  },
});

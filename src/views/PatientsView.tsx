import { defineComponent, onMounted, onUnmounted, ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { usePatients } from '../composables/usePatients';
import type { Patient, ServiceType } from '../types';
import { serviceLabel, allowedHospitalServices, formatDate } from '../utils/permissions';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  ErrorState,
  ConfirmDialog,
  DataTable,
  Pagination,
  type DataTableColumn,
  type BadgeVariant,
  defineDataTableColumns,
} from '../components/ui';

function serviceBadgeVariant(service: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    URGENCE: 'danger',
    ONCOLOGIE: 'warning',
    CARDIOLOGIE: 'info',
    GENERAL: 'success',
  };
  return map[service] || 'default';
}

/** Statuts réellement utilisés par le backend patient-service. */
function statusBadgeVariant(status: string): BadgeVariant {
  const s = String(status || '').toUpperCase();
  if (s === 'CRITICAL') return 'danger';
  if (s === 'STABLE') return 'success';
  return 'default';
}

function statusLabel(status: string): string {
  const s = String(status || '').toUpperCase();
  if (s === 'CRITICAL') return 'Critique';
  if (s === 'STABLE') return 'Stable';
  return status || '—';
}

const SEARCH_DEBOUNCE_MS = 300;

export default defineComponent({
  name: 'PatientsView',
  setup() {
    const auth = useAuthStore();
    const router = useRouter();
    const route = useRoute();
    const search = ref('');
    const service = ref<ServiceType | ''>('');
    const deleteTarget = ref<{ id: string; name: string } | null>(null);
    const deleting = ref(false);
    const deleteError = ref<string | null>(null);
    let searchTimer: ReturnType<typeof setTimeout> | null = null;

    const { patients, loading, errorMessage, fetchPatients, deletePatient, goToPage, totalPatients, currentPage, pageLimit } = usePatients();

    const canRead = computed(() => auth.hasPermission('patients:read'));
    const canCreate = computed(() => auth.hasPermission('patients:create'));
    const canUpdate = computed(() => auth.hasPermission('patients:update'));
    const canDelete = computed(() => auth.hasPermission('patients:delete'));
    const allowedServices = computed(() => allowedHospitalServices(auth.user?.permissions));
    const hasActiveFilters = computed(() => Boolean(search.value.trim() || service.value));

    function syncServiceFromRoute() {
      const q = route.query.service;
      const val = Array.isArray(q) ? q[0] : q;
      if (val && allowedServices.value.includes(val as ServiceType)) {
        service.value = val as ServiceType;
      } else {
        service.value = '';
      }
    }

    async function load() {
      deleteError.value = null;
      try {
        // Always reset buffer when filters change (search/service)
        await fetchPatients({
          search: search.value.trim() || undefined,
          service: service.value || undefined,
        });
      } catch {
        /* errorMessage set by composable */
      }
    }

    function scheduleSearch() {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        void load();
      }, SEARCH_DEBOUNCE_MS);
    }

    onMounted(() => {
      syncServiceFromRoute();
      void load();
    });

    onUnmounted(() => {
      if (searchTimer) clearTimeout(searchTimer);
    });

    watch(
      () => route.query.service,
      (newVal, oldVal) => {
        if (newVal === oldVal) return;
        syncServiceFromRoute();
        void load();
      }
    );

    async function confirmDelete() {
      if (!canDelete.value || !deleteTarget.value) return;
      deleting.value = true;
      deleteError.value = null;
      try {
        await deletePatient(deleteTarget.value.id);
        deleteTarget.value = null;
        // deletePatient updates the buffer locally — no full reload needed
      } catch {
        deleteError.value = 'Suppression impossible.';
        deleteTarget.value = null;
      } finally {
        deleting.value = false;
      }
    }

    function onServiceChange(val: ServiceType | '') {
      service.value = val;
      void router.replace({
        name: 'patients',
        query: val ? { service: val } : {},
      });
      void load();
    }

    const columns = computed(() => {
      const base: DataTableColumn<Patient>[] = [
        {
          key: 'patient_code',
          label: 'Code',
          className: 'col-code',
        },
        {
          key: 'last_name',
          label: 'Nom',
          render: (row) => String(row.last_name || '').toUpperCase(),
        },
        {
          key: 'first_name',
          label: 'Prénom',
        },
        {
          key: 'service',
          label: 'Service',
          render: (row) => (
            <Badge variant={serviceBadgeVariant(row.service)}>{serviceLabel(row.service)}</Badge>
          ),
        },
        {
          key: 'hospitalization_date',
          label: 'Hospitalisation',
          render: (row) => formatDate(row.hospitalization_date),
        },
      ];

      if (service.value === 'URGENCE') {
        base.push(
          {
            key: 'arrival_time',
            label: "Arrivée",
            render: (row) => row.specialty?.arrival_time || row.specialty?.arrivalTime || '—',
          },
          {
            key: 'triage_level',
            label: 'Triage',
            render: (row) => row.specialty?.triage_level || row.specialty?.triageLevel || '—',
          },
          {
            key: 'initial_severity',
            label: 'Gravité',
            render: (row) => row.specialty?.initial_severity || row.specialty?.initialSeverity || '—',
          }
        );
      } else if (service.value === 'ONCOLOGIE') {
        base.push(
          {
            key: 'tumor_type',
            label: 'Tumeur',
            render: (row) => row.specialty?.tumor_type || row.specialty?.tumorType || '—',
          },
          {
            key: 'stage',
            label: 'Stade',
            render: (row) => row.specialty?.stage || '—',
          },
          {
            key: 'current_treatment',
            label: 'Traitement',
            render: (row) => row.specialty?.current_treatment || row.specialty?.currentTreatment || '—',
          }
        );
      } else if (service.value === 'CARDIOLOGIE') {
        base.push(
          {
            key: 'ecg_results',
            label: 'ECG',
            render: (row) => row.specialty?.ecg_results || row.specialty?.ecgResults || '—',
          },
          {
            key: 'resting_heart_rate',
            label: 'FC repos',
            render: (row) => {
              const hr = row.specialty?.resting_heart_rate ?? row.specialty?.restingHeartRate;
              return hr != null ? `${hr} bpm` : '—';
            },
          },
          {
            key: 'blood_pressure',
            label: 'Tension',
            render: (row) => row.specialty?.blood_pressure || row.specialty?.bloodPressure || '—',
          }
        );
      }

      base.push(
        {
          key: 'status',
          label: 'Statut',
          render: (row) => (
            <Badge variant={statusBadgeVariant(row.status)}>{statusLabel(row.status)}</Badge>
          ),
        },
        {
          key: 'actions',
          label: 'Actions',
          className: 'col-actions',
          render: (row) => (
            <div class="row-actions">
              {canRead.value && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Voir le patient ${row.last_name} ${row.first_name}`}
                  onClick={() => router.push({ name: 'patient-detail', params: { id: row.id } })}
                >
                  Voir
                </Button>
              )}
              {canUpdate.value && (
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Modifier le patient ${row.last_name} ${row.first_name}`}
                  onClick={() => router.push({ name: 'patient-edit', params: { id: row.id } })}
                >
                  Modifier
                </Button>
              )}
              {canDelete.value && (
                <Button
                  variant="danger"
                  size="sm"
                  aria-label={`Supprimer le patient ${row.last_name} ${row.first_name}`}
                  onClick={() => {
                    deleteTarget.value = {
                      id: row.id,
                      name: `${String(row.last_name || '').toUpperCase()} ${row.first_name}`,
                    };
                  }}
                >
                  Supprimer
                </Button>
              )}
            </div>
          ),
        }
      );

      return defineDataTableColumns(base);
    });

    return () => (
      <div class="page">
        <PageHeader
          title="Patients"
          description={
            service.value
              ? `Service : ${serviceLabel(service.value)}`
              : 'Gestion des dossiers patients'
          }
          actions={
            canCreate.value ? (
              <Button onClick={() => router.push({ name: 'patient-create' })}>
                + Ajouter un patient
              </Button>
            ) : undefined
          }
        />

        {(errorMessage.value || deleteError.value) && (
          <ErrorState
            title={deleteError.value ? 'Suppression échouée' : 'Impossible de charger les patients'}
            message={deleteError.value || errorMessage.value || ''}
            retry={() => void load()}
          />
        )}

        <div class="toolbar">
          <input
            class="input"
            style="max-width:320px"
            placeholder="Rechercher un patient…"
            value={search.value}
            aria-label="Rechercher un patient"
            onInput={(ev: Event) => {
              search.value = (ev.target as HTMLInputElement).value;
              scheduleSearch();
            }}
            onKeyup={(ev: KeyboardEvent) => {
              if (ev.key === 'Enter') {
                if (searchTimer) clearTimeout(searchTimer);
                void load();
              }
            }}
          />
          <select
            class="select"
            style="max-width:220px"
            value={service.value}
            aria-label="Filtrer par service"
            onChange={(ev: Event) => {
              onServiceChange((ev.target as HTMLSelectElement).value as ServiceType | '');
            }}
          >
            <option value="">Tous les services</option>
            {allowedServices.value.map((s) => (
              <option value={s}>{serviceLabel(s)}</option>
            ))}
          </select>
          <Button
            variant="ghost"
            onClick={() => {
              if (searchTimer) clearTimeout(searchTimer);
              void load();
            }}
          >
            Filtrer
          </Button>
        </div>

        <Card padding="none">
          <DataTable
            columns={columns.value}
            rows={patients.value}
            rowKey="id"
            loading={loading.value}
            emptyTitle={
              hasActiveFilters.value
                ? 'Aucun patient ne correspond à vos critères.'
                : 'Aucun patient trouvé'
            }
            emptyDescription={
              hasActiveFilters.value
                ? 'Modifiez la recherche ou le filtre service.'
                : 'Aucun dossier dans votre périmètre de service.'
            }
          />
          <Pagination
            page={currentPage.value}
            limit={pageLimit.value}
            total={totalPatients.value}
            onPageChange={(p: number) => void goToPage(p)}
          />
        </Card>

        <ConfirmDialog
          open={Boolean(deleteTarget.value)}
          title="Supprimer le patient"
          message="Êtes-vous sûr de vouloir supprimer ce patient ?"
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          danger
          loading={deleting.value}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            deleteTarget.value = null;
          }}
        />
      </div>
    );
  },
});

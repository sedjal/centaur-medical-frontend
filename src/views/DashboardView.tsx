import { defineComponent, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useDashboard } from '../composables/useDashboard';
import type { Patient, ServiceOccupancy } from '../types';
import { serviceLabel, formatDate } from '../utils/permissions';
import {
  serviceCountRows,
  occupancyPercent,
  formatLastUpdated,
} from '../utils/dashboard';
import {
  PageHeader,
  StatCard,
  Card,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  DataTable,
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

function statusBadgeVariant(status: string): BadgeVariant {
  return String(status).toUpperCase() === 'CRITICAL' ? 'danger' : 'success';
}

function statusLabel(status: string): string {
  const s = String(status || '').toUpperCase();
  if (s === 'CRITICAL') return 'Critique';
  if (s === 'STABLE') return 'Stable';
  return status || '—';
}

function loadBadgeVariant(load: ServiceOccupancy['load']): BadgeVariant {
  if (load === 'Saturé') return 'danger';
  if (load === 'Forte charge') return 'warning';
  return 'success';
}

function loadBarClass(load: ServiceOccupancy['load']): string {
  if (load === 'Saturé') return 'dash-occ__bar dash-occ__bar--danger';
  if (load === 'Forte charge') return 'dash-occ__bar dash-occ__bar--warning';
  return 'dash-occ__bar dash-occ__bar--ok';
}

export default defineComponent({
  name: 'DashboardView',
  setup() {
    const auth = useAuthStore();
    const router = useRouter();
    const { stats, loading, errorMessage, lastUpdated, fetchStats } = useDashboard();

    const canReadPatients = computed(() => auth.hasPermission('patients:read'));
    const serviceRows = computed(() => serviceCountRows(stats.value?.byService));
    const occupancy = computed(() => stats.value?.occupancy || []);
    const recent = computed(() => stats.value?.recent || []);
    const updatedLabel = computed(() => formatLastUpdated(lastUpdated.value));

    async function load() {
      try {
        await fetchStats();
      } catch {
        /* errorMessage set by composable */
      }
    }

    onMounted(() => {
      void load();
    });

    const recentColumns = computed(() => {
      const cols: DataTableColumn<Patient>[] = [
        {
          key: 'patient_code',
          label: 'Code',
          className: 'col-code',
        },
        {
          key: 'patient',
          label: 'Patient',
          render: (row) =>
            `${String(row.last_name || '').toUpperCase()} ${row.first_name || ''}`.trim(),
        },
        {
          key: 'service',
          label: 'Service',
          render: (row) => (
            <Badge variant={serviceBadgeVariant(row.service)}>{serviceLabel(row.service)}</Badge>
          ),
        },
        {
          key: 'status',
          label: 'Statut',
          render: (row) => (
            <Badge variant={statusBadgeVariant(row.status)}>{statusLabel(row.status)}</Badge>
          ),
        },
        {
          key: 'hospitalization_date',
          label: 'Date',
          render: (row) => formatDate(row.hospitalization_date),
        },
      ];

      if (canReadPatients.value) {
        cols.push({
          key: 'actions',
          label: 'Actions',
          className: 'col-actions',
          render: (row) => (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Voir le patient ${row.last_name} ${row.first_name}`}
              onClick={() => router.push({ name: 'patient-detail', params: { id: row.id } })}
            >
              Voir
            </Button>
          ),
        });
      }

      return defineDataTableColumns(cols);
    });

    return () => (
      <div class="page dashboard-page">
        <PageHeader
          title="Dashboard"
          description="Vue d'ensemble de l'activité hospitalière"
          actions={
            <div class="dashboard-page__header-actions">
              {updatedLabel.value && (
                <span class="dashboard-page__updated">Actualisé à {updatedLabel.value}</span>
              )}
              <Button
                variant="outline"
                size="sm"
                loading={loading.value && Boolean(stats.value)}
                disabled={loading.value}
                onClick={() => void load()}
              >
                Actualiser
              </Button>
            </div>
          }
        />

        {loading.value && !stats.value && (
          <LoadingState message="Chargement du dashboard…" />
        )}

        {!loading.value && errorMessage.value && !stats.value && (
          <ErrorState
            title="Impossible de charger le dashboard"
            message={errorMessage.value}
            retry={() => void load()}
          />
        )}

        {stats.value && (
          <>
            {errorMessage.value && (
              <ErrorState
                title="Actualisation impossible"
                message={errorMessage.value}
                retry={() => void load()}
              />
            )}

            <div class="stat-grid dashboard-kpi" aria-label="Indicateurs clés">
              <StatCard title="Patients" value={stats.value.total} />
              <StatCard
                title="Critiques"
                value={stats.value.critical}
                description={stats.value.critical > 0 ? 'Surveillance prioritaire' : undefined}
              />
              <StatCard title="Admis aujourd'hui" value={stats.value.admittedToday} />
              <StatCard
                title="Lits disponibles"
                value={stats.value.availableBeds}
                description={`${stats.value.availableBeds} / ${stats.value.totalBeds}`}
              />
            </div>

            <div class="dashboard-panels">
              <Card title="Patients par service" padding="md">
                {serviceRows.value.length === 0 ? (
                  <EmptyState
                    title="Aucune répartition"
                    description="Aucun patient par service dans votre périmètre."
                  />
                ) : (
                  <ul class="dash-service-list">
                    {serviceRows.value.map((row) => (
                      <li key={row.service} class="dash-service-list__item">
                        <span class="dash-service-list__label">
                          <Badge variant={serviceBadgeVariant(row.service)}>{row.label}</Badge>
                        </span>
                        <span class="dash-service-list__count">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Occupation des lits" padding="md">
                {occupancy.value.length === 0 ? (
                  <EmptyState
                    title="Aucune occupation"
                    description="Aucune donnée d'occupation disponible."
                  />
                ) : (
                  <ul class="dash-occ-list">
                    {occupancy.value.map((o) => {
                      const pct = occupancyPercent(o.occupied, o.capacity, o.percent);
                      return (
                        <li key={o.service} class="dash-occ">
                          <div class="dash-occ__top">
                            <strong>{o.label || serviceLabel(o.service)}</strong>
                            <Badge variant={loadBadgeVariant(o.load)}>{o.load}</Badge>
                          </div>
                          <div class="dash-occ__meta">
                            {o.occupied} / {o.capacity} lits · {o.available} disponibles
                          </div>
                          <div class="dash-occ__track" aria-hidden="true">
                            <div
                              class={loadBarClass(o.load)}
                              style={`width:${Math.min(pct, 100)}%`}
                            />
                          </div>
                          <div class="dash-occ__percent">{pct}%</div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </div>

            <Card title="Patients récents" padding="none">
              <DataTable
                columns={recentColumns.value}
                rows={recent.value}
                rowKey="id"
                emptyTitle="Aucun patient récent"
                emptyDescription="Aucun dossier récent dans votre périmètre."
              />
            </Card>
          </>
        )}
      </div>
    );
  },
});

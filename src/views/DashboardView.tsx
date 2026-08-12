import { defineComponent, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { getDashboardStats } from '../services/patients';
import type { DashboardStats, ServiceOccupancy } from '../types';

function serviceBadge(service: string) {
  const map: Record<string, string> = {
    URGENCE: 'badge-red',
    ONCOLOGIE: 'badge-amber',
    CARDIOLOGIE: 'badge-blue',
    GENERAL: 'badge-teal',
  };
  return map[service] || 'badge-blue';
}

function loadClass(load: ServiceOccupancy['load']) {
  if (load === 'Saturé') return 'occ-bar danger';
  if (load === 'Forte charge') return 'occ-bar warning';
  return 'occ-bar ok';
}

function loadBadge(load: ServiceOccupancy['load']) {
  if (load === 'Saturé') return 'badge-red';
  if (load === 'Forte charge') return 'badge-amber';
  return 'badge-green';
}

export default defineComponent({
  name: 'DashboardView',
  setup() {
    const auth = useAuthStore();
    const router = useRouter();
    const stats = ref<DashboardStats | null>(null);
    const error = ref<string | null>(null);

    onMounted(async () => {
      try {
        stats.value = await getDashboardStats();
      } catch (e: unknown) {
        error.value =
          (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Impossible de charger le dashboard';
      }
    });

    return () => (
      <div class="page">
        <div class="page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Vue globale de l’établissement — {auth.user?.firstName || 'équipe'}</p>
          </div>
        </div>

        {error.value && <div class="alert alert-error">{error.value}</div>}

        <div class="stat-grid stat-grid-5">
          <div class="card stat-card">
            <div class="label">Patients actifs</div>
            <div class="value">{stats.value?.total ?? '—'}</div>
          </div>
          <div class="card stat-card">
            <div class="label">Admis aujourd’hui</div>
            <div class="value">{stats.value?.admittedToday ?? '—'}</div>
          </div>
          <div class="card stat-card">
            <div class="label">Lits disponibles</div>
            <div class="value">{stats.value?.availableBeds ?? '—'}</div>
            <div class="stat-sub">sur {stats.value?.totalBeds ?? '—'} lits</div>
          </div>
          <div class="card stat-card">
            <div class="label">Cas critiques</div>
            <div class="value">{stats.value?.critical ?? '—'}</div>
          </div>
          <div class="card stat-card">
            <div class="label">Urgences actuellement</div>
            <div class="value">{stats.value?.byService?.URGENCE ?? 0}</div>
          </div>
        </div>

        <div class="section-head">
          <h2>Occupation des services</h2>
        </div>
        <div class="occ-grid">
          {(stats.value?.occupancy || []).map((o) => (
            <div class="card occ-card" key={o.service}>
              <div class="occ-card-top">
                <strong>{o.label}</strong>
                <span class={`badge ${loadBadge(o.load)}`}>{o.load}</span>
              </div>
              <div class="occ-meta">
                {o.occupied} / {o.capacity} lits · {o.available} disponibles
              </div>
              <div class="occ-track">
                <div class={loadClass(o.load)} style={`width:${Math.min(o.percent, 100)}%`} />
              </div>
              <div class="occ-percent">{o.percent}%</div>
            </div>
          ))}
        </div>

        <div class="section-head" style="margin-top:8px">
          <h2>Patients récents</h2>
        </div>
        <div class="card" style="padding:8px 0">
          <table class="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Service</th>
                <th>Date d’admission</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {(stats.value?.recent || []).map((p) => (
                <tr
                  key={p.id}
                  style="cursor:pointer"
                  onClick={() => router.push({ name: 'patient-edit', params: { id: p.id } })}
                >
                  <td>
                    <div class="patient-cell">
                      <div class="avatar">
                        {p.first_name[0]}
                        {p.last_name[0]}
                      </div>
                      <div>
                        <div>
                          {p.first_name} {p.last_name}
                        </div>
                        <div style="font-size:12px;color:var(--muted)">{p.patient_code}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class={`badge ${serviceBadge(p.service)}`}>{p.service}</span>
                  </td>
                  <td>{String(p.hospitalization_date).slice(0, 10)}</td>
                  <td>
                    <span class={`badge ${p.status === 'CRITICAL' ? 'badge-red' : 'badge-green'}`}>
                      {p.status === 'CRITICAL' ? 'Critique' : 'Stable'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!stats.value?.recent?.length && <div class="empty">Aucun patient</div>}
        </div>
      </div>
    );
  },
});

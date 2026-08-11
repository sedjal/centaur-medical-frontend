import { defineComponent, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { getDashboardStats } from '../services/patients';
import type { DashboardStats } from '../types';

function serviceBadge(service: string) {
  const map: Record<string, string> = {
    URGENCE: 'badge-red',
    ONCOLOGIE: 'badge-amber',
    CARDIOLOGIE: 'badge-blue',
    GENERAL: 'badge-teal',
  };
  return map[service] || 'badge-blue';
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
          'Failed to load dashboard';
      }
    });

    return () => (
      <div class="page">
        <div class="page-header">
          <div>
            <h1>Good morning, {auth.user?.firstName || 'Doctor'}</h1>
            <p>Here is your hospital overview.</p>
          </div>
        </div>

        {error.value && <div class="alert alert-error">{error.value}</div>}

        <div class="stat-grid">
          <div class="card stat-card">
            <div class="label">Patients</div>
            <div class="value">{stats.value?.total ?? '—'}</div>
          </div>
          <div class="card stat-card">
            <div class="label">Urgence</div>
            <div class="value">{stats.value?.byService?.URGENCE ?? 0}</div>
          </div>
          <div class="card stat-card">
            <div class="label">Oncologie</div>
            <div class="value">{stats.value?.byService?.ONCOLOGIE ?? 0}</div>
          </div>
          <div class="card stat-card">
            <div class="label">Cardiologie</div>
            <div class="value">{stats.value?.byService?.CARDIOLOGIE ?? 0}</div>
          </div>
        </div>

        <div class="card" style="padding:8px 0">
          <div style="padding:16px 20px;font-weight:600">Recent patients</div>
          <table class="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Service</th>
                <th>Date</th>
                <th>Status</th>
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
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!stats.value?.recent?.length && <div class="empty">No patients yet</div>}
        </div>
      </div>
    );
  },
});

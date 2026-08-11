import { defineComponent, onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { listPatients, deletePatient } from '../services/patients';
import type { Patient, ServiceType } from '../types';

const SERVICES: Array<ServiceType | ''> = ['', 'GENERAL', 'URGENCE', 'ONCOLOGIE', 'CARDIOLOGIE'];

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
  name: 'PatientsView',
  setup() {
    const auth = useAuthStore();
    const router = useRouter();
    const patients = ref<Patient[]>([]);
    const search = ref('');
    const service = ref<ServiceType | ''>('');
    const loading = ref(false);
    const error = ref<string | null>(null);
    const openMenu = ref<string | null>(null);

    const canCreate = computed(() => auth.hasPermission('patients:create'));
    const canUpdate = computed(() => auth.hasPermission('patients:update'));
    const canDelete = computed(() => auth.hasPermission('patients:delete'));

    async function load() {
      loading.value = true;
      error.value = null;
      try {
        patients.value = await listPatients({
          search: search.value || undefined,
          service: service.value || undefined,
        });
      } catch (e: unknown) {
        error.value =
          (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to load patients';
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    async function onDelete(id: string, name: string) {
      if (!canDelete.value) return;
      if (!confirm(`Delete patient ${name}?`)) return;
      try {
        await deletePatient(id);
        openMenu.value = null;
        await load();
      } catch (e: unknown) {
        error.value =
          (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Delete failed';
      }
    }

    return () => (
      <div class="page">
        <div class="page-header">
          <div>
            <h1>Patients</h1>
            <p>Manage hospital patients and medical records.</p>
          </div>
          {canCreate.value && (
            <button class="btn btn-primary" onClick={() => router.push({ name: 'patient-create' })}>
              + New patient
            </button>
          )}
        </div>

        <div class="toolbar">
          <input
            class="input"
            style="max-width:320px"
            placeholder="Search patient…"
            value={search.value}
            onInput={(ev: Event) => {
              search.value = (ev.target as HTMLInputElement).value;
            }}
            onKeyup={(ev: KeyboardEvent) => {
              if (ev.key === 'Enter') void load();
            }}
          />
          <select
            class="select"
            style="max-width:200px"
            value={service.value}
            onChange={(ev: Event) => {
              service.value = (ev.target as HTMLSelectElement).value as ServiceType | '';
              void load();
            }}
          >
            <option value="">All services</option>
            {SERVICES.filter(Boolean).map((s) => (
              <option key={s as string} value={s as string}>
                {s as string}
              </option>
            ))}
          </select>
          <button class="btn btn-ghost" onClick={() => void load()}>
            Search
          </button>
        </div>

        {error.value && <div class="alert alert-error">{error.value}</div>}

        <div class="card" style="padding:8px 0;position:relative">
          {loading.value && <div class="empty">Loading…</div>}
          {!loading.value && (
            <table class="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Service</th>
                  <th>Hospitalized</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.value.map((p) => (
                  <tr key={p.id}>
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
                    <td style="position:relative">
                      <button
                        class="btn btn-ghost"
                        onClick={() => {
                          openMenu.value = openMenu.value === p.id ? null : p.id;
                        }}
                      >
                        ⋮
                      </button>
                      {openMenu.value === p.id && (
                        <div
                          class="card"
                          style="position:absolute;right:16px;top:48px;z-index:5;min-width:160px;padding:8px;display:flex;flex-direction:column;gap:4px"
                        >
                          {canUpdate.value && (
                            <button
                              class="btn btn-ghost"
                              onClick={() => router.push({ name: 'patient-edit', params: { id: p.id } })}
                            >
                              Edit patient
                            </button>
                          )}
                          {canDelete.value && (
                            <button
                              class="btn btn-danger"
                              onClick={() =>
                                void onDelete(p.id, `${p.first_name} ${p.last_name}`)
                              }
                            >
                              Delete patient
                            </button>
                          )}
                          {!canUpdate.value && !canDelete.value && (
                            <span style="padding:8px;font-size:13px;color:var(--muted)">
                              View only
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading.value && !patients.value.length && (
            <div class="empty">No patients found</div>
          )}
        </div>
      </div>
    );
  },
});

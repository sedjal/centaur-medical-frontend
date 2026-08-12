import { defineComponent, onMounted, ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { listPatients, deletePatient } from '../services/patients';
import type { Patient, ServiceType } from '../types';
import { serviceLabel } from '../utils/permissions';

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
    const route = useRoute();
    const patients = ref<Patient[]>([]);
    const search = ref('');
    const service = ref<ServiceType | ''>('');
    const loading = ref(false);
    const error = ref<string | null>(null);
    const openMenu = ref<string | null>(null);

    const canCreate = computed(() => auth.hasPermission('patients:create'));
    const canUpdate = computed(() => auth.hasPermission('patients:update'));
    const canDelete = computed(() => auth.hasPermission('patients:delete'));

    function syncServiceFromRoute() {
      const q = route.query.service;
      const val = Array.isArray(q) ? q[0] : q;
      if (val && SERVICES.includes(val as ServiceType)) {
        service.value = val as ServiceType;
      } else if (!val) {
        service.value = '';
      }
    }

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
          'Impossible de charger les patients';
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => {
      syncServiceFromRoute();
      void load();
    });

    watch(
      () => route.query.service,
      () => {
        syncServiceFromRoute();
        void load();
      }
    );

    async function onDelete(id: string, name: string) {
      if (!canDelete.value) return;
      if (!confirm(`Supprimer le patient ${name} ?`)) return;
      try {
        await deletePatient(id);
        openMenu.value = null;
        await load();
      } catch (e: unknown) {
        error.value =
          (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Suppression impossible';
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

    return () => (
      <div class="page">
        <div class="page-header">
          <div>
            <h1>Patients</h1>
            <p>
              {service.value
                ? `Service : ${serviceLabel(service.value)}`
                : 'Gestion des patients et dossiers médicaux.'}
            </p>
          </div>
          {canCreate.value && (
            <button class="btn btn-primary" onClick={() => router.push({ name: 'patient-create' })}>
              + Nouveau patient
            </button>
          )}
        </div>

        {error.value && <div class="alert alert-error">{error.value}</div>}

        <div class="toolbar">
          <input
            class="input"
            style="max-width:320px"
            placeholder="Rechercher un patient…"
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
            style="max-width:220px"
            value={service.value}
            onChange={(ev: Event) => {
              onServiceChange((ev.target as HTMLSelectElement).value as ServiceType | '');
            }}
          >
            <option value="">Tous les services</option>
            {SERVICES.filter(Boolean).map((s) => (
              <option value={s}>{serviceLabel(String(s))}</option>
            ))}
          </select>
          <button class="btn btn-ghost" onClick={() => void load()}>
            Filtrer
          </button>
        </div>

        <div class="card" style="padding:8px 0;position:relative">
          {loading.value && <div class="empty">Chargement…</div>}
          {!loading.value && (
            <table class="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Service</th>
                  <th>Admission</th>
                  <th>Statut</th>
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
                      <span class={`badge ${serviceBadge(p.service)}`}>{serviceLabel(p.service)}</span>
                    </td>
                    <td>{String(p.hospitalization_date).slice(0, 10)}</td>
                    <td>
                      <span class={`badge ${p.status === 'CRITICAL' ? 'badge-red' : 'badge-green'}`}>
                        {p.status === 'CRITICAL' ? 'Critique' : 'Stable'}
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
                              onClick={() =>
                                router.push({ name: 'patient-edit', params: { id: p.id } })
                              }
                            >
                              Voir / modifier
                            </button>
                          )}
                          {canDelete.value && (
                            <button
                              class="btn btn-danger"
                              onClick={() =>
                                void onDelete(p.id, `${p.first_name} ${p.last_name}`)
                              }
                            >
                              Supprimer
                            </button>
                          )}
                          {!canUpdate.value && !canDelete.value && (
                            <span style="padding:8px;font-size:13px;color:var(--muted)">
                              Lecture seule
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
            <div class="empty">Aucun patient trouvé</div>
          )}
        </div>
      </div>
    );
  },
});

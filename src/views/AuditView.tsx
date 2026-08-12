import { defineComponent, onMounted, ref } from 'vue';
import { getAuditLogs } from '../services/patients';
import type { AuditLog } from '../types';

export default defineComponent({
  name: 'AuditView',
  setup() {
    const logs = ref<AuditLog[]>([]);
    const error = ref<string | null>(null);

    onMounted(async () => {
      try {
        logs.value = await getAuditLogs();
      } catch (e: unknown) {
        error.value =
          (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to load audit logs';
      }
    });

    return () => (
      <div class="page">
        <div class="page-header">
          <div>
            <h1>Historique</h1>
            <p>Journal des opérations sensibles sur les dossiers médicaux.</p>
          </div>
        </div>
        {error.value && <div class="alert alert-error">{error.value}</div>}
        <div class="card" style="padding:8px 0">
          <table class="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Patient</th>
                <th>When</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.value.map((l) => (
                <tr key={l.id}>
                  <td>
                    {l.user_first_name} {l.user_last_name}
                    <div style="font-size:12px;color:var(--muted)">{l.user_email}</div>
                  </td>
                  <td>
                    <span class="badge badge-blue">
                      {l.action} {l.resource}
                    </span>
                  </td>
                  <td>{l.patient_name || '—'}</td>
                  <td>{new Date(l.created_at).toLocaleString()}</td>
                  <td>{l.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logs.value.length && <div class="empty">No audit events yet</div>}
        </div>
      </div>
    );
  },
});

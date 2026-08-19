import { defineComponent, onMounted, ref, computed } from 'vue';
import { useUserStore } from '../stores/user';

const PERM_GROUPS: Array<{ title: string; codes: string[] }> = [
  {
    title: 'Patients',
    codes: ['patients:read', 'patients:create', 'patients:update', 'patients:delete'],
  },
  {
    title: 'Services',
    codes: ['service:general', 'service:urgence', 'service:oncologie', 'service:cardiologie'],
  },
  {
    title: 'Utilisateurs',
    codes: ['users:read', 'users:create', 'users:update', 'users:delete'],
  },
  {
    title: 'Documents',
    codes: ['documents:read', 'documents:create', 'documents:delete'],
  },
  {
    title: 'Comptes rendus',
    codes: ['reports:read', 'reports:create'],
  },
  {
    title: 'Administration',
    codes: ['roles:manage', 'audit:read'],
  },
];

export default defineComponent({
  name: 'RolesView',
  setup() {
    const store = useUserStore();
    /** roleId -> permission codes */
    const draft = ref<Record<string, string[]>>({});
    const newRoleName = ref('');
    const showCreate = ref(false);
    const saving = ref(false);
    const localError = ref<string | null>(null);
    const localSuccess = ref<string | null>(null);

    const dirty = computed(() => {
      return store.roles.some((r) => {
        const a = [...(draft.value[r.id] || [])].sort().join('|');
        const b = [...r.permissions].sort().join('|');
        return a !== b;
      });
    });

    function syncDraftFromStore() {
      const next: Record<string, string[]> = {};
      for (const r of store.roles) {
        next[r.id] = [...r.permissions];
      }
      draft.value = next;
    }

    function hasPerm(roleId: string, code: string) {
      return (draft.value[roleId] || []).includes(code);
    }

    function toggle(roleId: string, code: string) {
      const current = draft.value[roleId] || [];
      const next = current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code];
      draft.value = { ...draft.value, [roleId]: next };
      localSuccess.value = null;
    }

    function descFor(code: string) {
      return store.permissions.find((p) => p.code === code)?.description || code;
    }

    onMounted(async () => {
      try {
        await Promise.all([store.fetchRoles(), store.fetchPermissions()]);
        syncDraftFromStore();
      } catch (e: unknown) {
        localError.value =
          (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Impossible de charger les rôles';
      }
    });

    async function saveAll() {
      saving.value = true;
      localError.value = null;
      localSuccess.value = null;
      try {
        for (const r of store.roles) {
          const a = [...(draft.value[r.id] || [])].sort().join('|');
          const b = [...r.permissions].sort().join('|');
          if (a !== b) {
            await store.saveRolePermissions(r.id, draft.value[r.id] || []);
          }
        }
        syncDraftFromStore();
        localSuccess.value = 'Permissions enregistrées.';
      } catch (e: unknown) {
        localError.value =
          (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Enregistrement impossible';
      } finally {
        saving.value = false;
      }
    }

    async function createRole(e: Event) {
      e.preventDefault();
      saving.value = true;
      localError.value = null;
      try {
        const name = newRoleName.value.trim();
        await store.createRole(name, ['patients:read']);
        showCreate.value = false;
        newRoleName.value = '';
        syncDraftFromStore();
      } catch (err: unknown) {
        localError.value =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Création impossible';
      } finally {
        saving.value = false;
      }
    }

    async function removeRole(id: string, name: string, isSystem: boolean) {
      if (isSystem) return;
      if (!confirm(`Supprimer le rôle ${name} ?`)) return;
      try {
        await store.removeRole(id);
        syncDraftFromStore();
      } catch (e: unknown) {
        localError.value =
          (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Suppression impossible';
      }
    }

    return () => (
      <div class="page">
        <div class="page-header">
          <div>
            <h1>Rôles & permissions</h1>
            <p>Matrice des droits d’accès par rôle.</p>
          </div>
          <div class="row-actions">
            <button
              class="btn btn-ghost"
              onClick={() => {
                showCreate.value = true;
                localError.value = null;
              }}
            >
              + Nouveau rôle
            </button>
            <button
              class="btn btn-primary"
              disabled={saving.value || !dirty.value}
              onClick={() => void saveAll()}
            >
              {saving.value ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>

        {localError.value && <div class="alert alert-error">{localError.value}</div>}
        {localSuccess.value && <div class="alert alert-success">{localSuccess.value}</div>}

        <div class="card" style="padding:8px 0;overflow:auto">
          <table class="table roles-matrix">
            <thead>
              <tr>
                <th class="matrix-perm-col">Permission</th>
                {store.roles.map((r) => (
                  <th key={r.id} class="matrix-role-col">
                    <div class="matrix-role-head">
                      <strong>{r.name}</strong>
                      {r.is_system ? (
                        <span class="badge badge-teal">Système</span>
                      ) : (
                        <button
                          class="btn btn-danger btn-sm"
                          type="button"
                          onClick={() => void removeRole(r.id, r.name, r.is_system)}
                        >
                          Suppr.
                        </button>
                      )}
                    </div>
                    <div class="matrix-role-meta">
                      {(draft.value[r.id] || []).length} droits · {r.user_count} util.
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERM_GROUPS.flatMap((group) => [
                <tr key={`g-${group.title}`} class="matrix-group-row">
                  <td colspan={store.roles.length + 1}>{group.title}</td>
                </tr>,
                ...group.codes.map((code) => (
                  <tr key={code}>
                    <td>
                      <div class="matrix-perm-label">
                        <strong>{code}</strong>
                        <span>{descFor(code)}</span>
                      </div>
                    </td>
                    {store.roles.map((r) => (
                      <td key={`${r.id}-${code}`} class="matrix-check-cell">
                        <input
                          type="checkbox"
                          checked={hasPerm(r.id, code)}
                          onChange={() => toggle(r.id, code)}
                          aria-label={`${r.name} — ${code}`}
                        />
                      </td>
                    ))}
                  </tr>
                )),
              ])}
            </tbody>
          </table>
          {!store.roles.length && <div class="empty">Aucun rôle</div>}
        </div>

        {showCreate.value && (
          <div class="modal-backdrop" onClick={() => (showCreate.value = false)}>
            <div
              class="card modal"
              onClick={(ev: Event) => {
                ev.stopPropagation();
              }}
            >
              <h2 style="margin:0 0 8px;font-size:18px">Nouveau rôle</h2>
              <p style="margin:0 0 16px;color:var(--muted);font-size:13px">
                Le nom sera normalisé en majuscules (ex. INFIRMIER).
              </p>
              <form onSubmit={createRole}>
                <div class="field">
                  <label>Nom du rôle</label>
                  <input
                    class="input"
                    value={newRoleName.value}
                    onInput={(ev: Event) => {
                      newRoleName.value = (ev.target as HTMLInputElement).value;
                    }}
                    required
                    minLength={2}
                    placeholder="INFIRMIER"
                  />
                </div>
                <div class="modal-actions">
                  <button
                    type="button"
                    class="btn btn-ghost"
                    onClick={() => (showCreate.value = false)}
                  >
                    Annuler
                  </button>
                  <button type="submit" class="btn btn-primary" disabled={saving.value}>
                    Créer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  },
});

import { defineComponent, onMounted, ref, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useUserStore } from '../stores/user';
import type { AppUser, RoleName } from '../types';

function emptyForm() {
  return {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'MEDECIN' as RoleName,
    isActive: true,
  };
}

export default defineComponent({
  name: 'UsersView',
  setup() {
    const auth = useAuthStore();
    const store = useUserStore();
    const showModal = ref(false);
    const editing = ref<AppUser | null>(null);
    const form = ref(emptyForm());
    const saving = ref(false);
    const formError = ref<string | null>(null);

    const canCreate = computed(() => auth.hasPermission('users:create'));
    const canUpdate = computed(() => auth.hasPermission('users:update'));
    const canDelete = computed(() => auth.hasPermission('users:delete'));
    const roleOptions = computed(() => store.roles.map((r) => r.name));

    onMounted(async () => {
      await Promise.all([store.fetchUsers(), store.fetchRoles().catch(() => undefined)]);
    });

    function openCreate() {
      editing.value = null;
      form.value = emptyForm();
      if (roleOptions.value.length) form.value.role = roleOptions.value[0];
      formError.value = null;
      showModal.value = true;
    }

    function openEdit(u: AppUser) {
      editing.value = u;
      form.value = {
        email: u.email,
        password: '',
        firstName: u.first_name,
        lastName: u.last_name,
        role: u.role,
        isActive: u.is_active,
      };
      formError.value = null;
      showModal.value = true;
    }

    async function onSave(e: Event) {
      e.preventDefault();
      saving.value = true;
      formError.value = null;
      try {
        if (editing.value) {
          await store.updateUser(editing.value.id, {
            firstName: form.value.firstName.trim(),
            lastName: form.value.lastName.trim(),
            role: form.value.role,
            isActive: form.value.isActive,
          });
        } else {
          await store.createUser({
            email: form.value.email.trim(),
            password: form.value.password,
            firstName: form.value.firstName.trim(),
            lastName: form.value.lastName.trim(),
            role: form.value.role,
          });
        }
        showModal.value = false;
      } catch (err: unknown) {
        formError.value =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Enregistrement impossible';
      } finally {
        saving.value = false;
      }
    }

    async function onDelete(u: AppUser) {
      if (!canDelete.value) return;
      if (u.id === auth.user?.id) {
        store.error = 'Vous ne pouvez pas supprimer votre propre compte';
        return;
      }
      if (!confirm(`Supprimer l'utilisateur ${u.first_name} ${u.last_name} ?`)) return;
      try {
        await store.removeUser(u.id);
      } catch (err: unknown) {
        store.error =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Suppression impossible';
      }
    }

    watch(showModal, (v) => {
      if (!v) {
        editing.value = null;
        formError.value = null;
      }
    });

    return () => (
      <div class="page">
        <div class="page-header">
          <div>
            <h1>Utilisateurs</h1>
            <p>Gestion des comptes, rôles et accès à la plateforme.</p>
          </div>
          {canCreate.value && (
            <button class="btn btn-primary" onClick={openCreate}>
              + Nouvel utilisateur
            </button>
          )}
        </div>

        {store.error && <div class="alert alert-error">{store.error}</div>}

        <div class="card" style="padding:8px 0">
          <table class="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>MFA</th>
                <th>1ʳᵉ connexion</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {store.users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div class="patient-cell">
                      <div class="avatar">
                        {u.first_name[0]}
                        {u.last_name[0]}
                      </div>
                      <div>
                        {u.first_name} {u.last_name}
                      </div>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span class="badge badge-blue">{u.role}</span>
                  </td>
                  <td>
                    <span class={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                      {u.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td>{u.mfa_required ? 'Requis' : '—'}</td>
                  <td>
                    {u.must_change_password ? (
                      <span class="badge badge-amber">À changer</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <div class="row-actions">
                      {canUpdate.value && (
                        <button class="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>
                          Modifier
                        </button>
                      )}
                      {canDelete.value && (
                        <button class="btn btn-danger btn-sm" onClick={() => onDelete(u)}>
                          Supprimer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!store.users.length && !store.loading && <div class="empty">Aucun utilisateur</div>}
        </div>

        {showModal.value && (
          <div class="modal-backdrop" onClick={() => (showModal.value = false)}>
            <div
              class="card modal"
              onClick={(ev: Event) => {
                ev.stopPropagation();
              }}
            >
              <div class="page-header" style="margin-bottom:16px">
                <div>
                  <h1 style="font-size:20px">
                    {editing.value ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'}
                  </h1>
                  <p>
                    {editing.value
                      ? 'Mettre à jour le profil et le rôle.'
                      : 'Un email de bienvenue Centaur Medical sera envoyé.'}
                  </p>
                </div>
              </div>
              {formError.value && <div class="alert alert-error">{formError.value}</div>}
              <form onSubmit={onSave}>
                <div class="grid-2">
                  <div class="field">
                    <label>Prénom</label>
                    <input
                      class="input"
                      value={form.value.firstName}
                      onInput={(ev: Event) => {
                        form.value.firstName = (ev.target as HTMLInputElement).value;
                      }}
                      required
                    />
                  </div>
                  <div class="field">
                    <label>Nom</label>
                    <input
                      class="input"
                      value={form.value.lastName}
                      onInput={(ev: Event) => {
                        form.value.lastName = (ev.target as HTMLInputElement).value;
                      }}
                      required
                    />
                  </div>
                </div>
                {!editing.value && (
                  <>
                    <div class="field">
                      <label>Email</label>
                      <input
                        class="input"
                        type="email"
                        value={form.value.email}
                        onInput={(ev: Event) => {
                          form.value.email = (ev.target as HTMLInputElement).value;
                        }}
                        required
                      />
                    </div>
                    <div class="field">
                      <label>Mot de passe temporaire</label>
                      <div style="display:flex;gap:8px">
                        <input
                          class="input"
                          type="text"
                          minLength={8}
                          value={form.value.password}
                          onInput={(ev: Event) => {
                            form.value.password = (ev.target as HTMLInputElement).value;
                          }}
                          required
                        />
                        <button
                          type="button"
                          class="btn btn-ghost"
                          onClick={() => {
                            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';
                            let pwd = '';
                            for (let i = 0; i < 12; i++) {
                              pwd += chars[Math.floor(Math.random() * chars.length)];
                            }
                            // ensure policy: letter + digit
                            form.value.password = `${pwd}A1`;
                          }}
                        >
                          Générer
                        </button>
                      </div>
                      <small style="color:var(--muted)">
                        Envoyé par email Centaur Medical — changement obligatoire à la 1ʳᵉ connexion.
                      </small>
                    </div>
                  </>
                )}
                <div class="field">
                  <label>Rôle</label>
                  <select
                    class="select"
                    value={form.value.role}
                    onChange={(ev: Event) => {
                      form.value.role = (ev.target as HTMLSelectElement).value as RoleName;
                    }}
                  >
                    {(roleOptions.value.length
                      ? roleOptions.value
                      : ['ADMIN', 'DIRECTION', 'MEDECIN', 'SECRETAIRE']
                    ).map((r) => (
                      <option value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                {editing.value && (
                  <div class="field">
                    <label class="checkbox-row">
                      <input
                        type="checkbox"
                        checked={form.value.isActive}
                        onChange={(ev: Event) => {
                          form.value.isActive = (ev.target as HTMLInputElement).checked;
                        }}
                      />
                      Compte actif
                    </label>
                  </div>
                )}
                <div class="modal-actions">
                  <button
                    type="button"
                    class="btn btn-ghost"
                    onClick={() => (showModal.value = false)}
                  >
                    Annuler
                  </button>
                  <button type="submit" class="btn btn-primary" disabled={saving.value}>
                    {saving.value ? 'Enregistrement…' : 'Enregistrer'}
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

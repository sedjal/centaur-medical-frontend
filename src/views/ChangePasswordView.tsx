import { defineComponent, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

export default defineComponent({
  name: 'ChangePasswordView',
  setup() {
    const auth = useAuthStore();
    const router = useRouter();
    const currentPassword = ref('');
    const newPassword = ref('');
    const confirmPassword = ref('');
    const localError = ref<string | null>(null);

    onMounted(() => {
      if (!auth.tempToken && !localStorage.getItem('centaur_temp_token')) {
        void router.replace({ name: 'login' });
      }
    });

    async function onSubmit(e: Event) {
      e.preventDefault();
      localError.value = null;
      if (newPassword.value !== confirmPassword.value) {
        localError.value = 'Les mots de passe ne correspondent pas';
        return;
      }
      try {
        const result = await auth.completeForcedPasswordChange(
          currentPassword.value,
          newPassword.value
        );
        if (result.status === 'REQUIRES_MFA') {
          await router.push({ name: 'mfa' });
          return;
        }
        await router.push({ name: 'dashboard' });
      } catch {
        localError.value = auth.error || 'Changement impossible';
      }
    }

    return () => (
      <div class="auth-page">
        <div class="card auth-card">
          <div class="brand" style="padding:0 0 20px">
            <div class="brand-mark">CM</div>
            <div class="brand-text">
              <strong>Centaur Medical</strong>
              <span>Sécurité du compte</span>
            </div>
          </div>
          <h1 style="margin:0 0 8px;font-size:22px">Changer le mot de passe</h1>
          <p style="margin:0 0 24px;color:var(--muted);font-size:14px">
            Votre mot de passe provisoire doit être modifié avant d’accéder à la plateforme.
          </p>
          {localError.value && <div class="alert alert-error">{localError.value}</div>}
          <form onSubmit={onSubmit}>
            <div class="field">
              <label>Mot de passe provisoire</label>
              <input
                class="input"
                type="password"
                value={currentPassword.value}
                onInput={(ev: Event) => {
                  currentPassword.value = (ev.target as HTMLInputElement).value;
                }}
                required
                autocomplete="current-password"
              />
            </div>
            <div class="field">
              <label>Nouveau mot de passe</label>
              <input
                class="input"
                type="password"
                minLength={8}
                value={newPassword.value}
                onInput={(ev: Event) => {
                  newPassword.value = (ev.target as HTMLInputElement).value;
                }}
                required
                autocomplete="new-password"
              />
              <small style="color:var(--muted)">Au moins 8 caractères, une lettre et un chiffre.</small>
            </div>
            <div class="field">
              <label>Confirmer</label>
              <input
                class="input"
                type="password"
                minLength={8}
                value={confirmPassword.value}
                onInput={(ev: Event) => {
                  confirmPassword.value = (ev.target as HTMLInputElement).value;
                }}
                required
                autocomplete="new-password"
              />
            </div>
            <button
              class="btn btn-primary"
              style="width:100%;justify-content:center"
              disabled={auth.loading}
            >
              {auth.loading ? 'Enregistrement…' : 'Enregistrer et continuer'}
            </button>
          </form>
        </div>
      </div>
    );
  },
});

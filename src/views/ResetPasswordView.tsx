import { defineComponent, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

export default defineComponent({
  name: 'ResetPasswordView',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const auth = useAuthStore();
    const token = ref('');
    const newPassword = ref('');
    const confirmPassword = ref('');
    const localError = ref<string | null>(null);
    const done = ref(false);

    onMounted(() => {
      const q = route.query.token;
      token.value = Array.isArray(q) ? String(q[0] || '') : String(q || '');
      if (!token.value) localError.value = 'Lien de réinitialisation invalide';
    });

    async function onSubmit(e: Event) {
      e.preventDefault();
      localError.value = null;
      if (!token.value) {
        localError.value = 'Lien de réinitialisation invalide';
        return;
      }
      if (newPassword.value !== confirmPassword.value) {
        localError.value = 'Les mots de passe ne correspondent pas';
        return;
      }
      try {
        await auth.resetPassword(token.value, newPassword.value);
        done.value = true;
      } catch {
        localError.value = auth.error || 'Réinitialisation impossible';
      }
    }

    return () => (
      <div class="auth-page">
        <div class="card auth-card">
          <div class="brand" style="padding:0 0 20px">
            <div class="brand-mark">CM</div>
            <div class="brand-text">
              <strong>Centaur Medical</strong>
              <span>Nouveau mot de passe</span>
            </div>
          </div>
          <h1 style="margin:0 0 8px;font-size:22px">Réinitialiser le mot de passe</h1>
          <p style="margin:0 0 24px;color:var(--muted);font-size:14px">
            Choisissez un nouveau mot de passe sécurisé.
          </p>
          {localError.value && <div class="alert alert-error">{localError.value}</div>}
          {done.value ? (
            <>
              <div class="alert alert-success">
                Mot de passe mis à jour. Vous pouvez vous connecter.
              </div>
              <button
                class="btn btn-primary"
                style="width:100%;justify-content:center"
                onClick={() => router.push({ name: 'login' })}
              >
                Se connecter
              </button>
            </>
          ) : (
            <form onSubmit={onSubmit}>
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
                <small style="color:var(--muted)">
                  Au moins 8 caractères, une lettre et un chiffre.
                </small>
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
                disabled={auth.loading || !token.value}
              >
                {auth.loading ? 'Enregistrement…' : 'Réinitialiser'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  },
});

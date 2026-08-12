import { defineComponent, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

export default defineComponent({
  name: 'LoginView',
  setup() {
    const route = useRoute();
    const email = ref('');
    const password = ref('');
    const auth = useAuthStore();
    const router = useRouter();
    const localError = ref<string | null>(null);

    onMounted(() => {
      const q = route.query.email;
      const fromQuery = Array.isArray(q) ? String(q[0] || '') : String(q || '');
      if (fromQuery) email.value = fromQuery;
    });

    async function onSubmit(e: Event) {
      e.preventDefault();
      localError.value = null;
      try {
        const result = await auth.login(email.value.trim(), password.value);
        if (result.status === 'REQUIRES_MFA') {
          await router.push({ name: 'mfa' });
          return;
        }
        if (result.status === 'CHANGE_PASSWORD') {
          await router.push({ name: 'change-password' });
          return;
        }
        await router.push({ name: 'dashboard' });
      } catch {
        localError.value = auth.error || 'Échec de connexion';
      }
    }

    function goForgotPassword(ev: Event) {
      ev.preventDefault();
      void router.push({
        name: 'forgot-password',
        query: email.value.trim() ? { email: email.value.trim() } : {},
      });
    }

    return () => (
      <div class="auth-page">
        <div class="card auth-card">
          <div class="brand" style="padding:0 0 20px">
            <div class="brand-mark">CM</div>
            <div class="brand-text">
              <strong>Centaur Medical</strong>
              <span>Gestion des dossiers médicaux</span>
            </div>
          </div>
          <h1 style="margin:0 0 8px;font-size:24px">Connexion</h1>
          <p style="margin:0 0 24px;color:var(--muted);font-size:14px">
            Accès sécurisé aux dossiers médicaux.
          </p>
          {localError.value && <div class="alert alert-error">{localError.value}</div>}
          <form onSubmit={onSubmit}>
            <div class="field">
              <label>Email</label>
              <input
                class="input"
                type="email"
                value={email.value}
                onInput={(ev: Event) => {
                  email.value = (ev.target as HTMLInputElement).value;
                }}
                required
                autocomplete="username"
              />
            </div>
            <div class="field">
              <label>Mot de passe</label>
              <input
                class="input"
                type="password"
                value={password.value}
                onInput={(ev: Event) => {
                  password.value = (ev.target as HTMLInputElement).value;
                }}
                required
                autocomplete="current-password"
              />
            </div>
            <div style="text-align:right;margin:-4px 0 16px">
              <a
                href="#/forgot-password"
                style="font-size:13px;color:var(--primary);font-weight:600"
                onClick={goForgotPassword}
              >
                Mot de passe oublié ?
              </a>
            </div>
            <button
              class="btn btn-primary"
              style="width:100%;justify-content:center"
              disabled={auth.loading}
            >
              {auth.loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    );
  },
});

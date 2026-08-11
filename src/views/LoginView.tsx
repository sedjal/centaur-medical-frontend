import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

export default defineComponent({
  name: 'LoginView',
  setup() {
    const email = ref('sedjalkhouloud@gmail.com');
    const password = ref('Admin123!');
    const auth = useAuthStore();
    const router = useRouter();
    const localError = ref<string | null>(null);

    async function onSubmit(e: Event) {
      e.preventDefault();
      localError.value = null;
      try {
        const result = await auth.login(email.value.trim(), password.value);
        if (result.status === 'REQUIRES_MFA') {
          await router.push({ name: 'mfa' });
          return;
        }
        if (result.status === 'OK') {
          await router.push({ name: 'dashboard' });
          return;
        }
        localError.value = 'Password change required (not implemented in UI).';
      } catch {
        localError.value = auth.error || 'Login failed';
      }
    }

    return () => (
      <div class="auth-page">
        <div class="card auth-card">
          <div class="brand" style="padding:0 0 20px">
            <div class="brand-mark">CM</div>
            <div class="brand-text">
              <strong>Centaur Medical</strong>
              <span>Hospital Patient Management</span>
            </div>
          </div>
          <h1 style="margin:0 0 8px;font-size:24px">Sign in</h1>
          <p style="margin:0 0 24px;color:var(--muted);font-size:14px">
            Access medical records securely.
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
              />
            </div>
            <div class="field">
              <label>Password</label>
              <input
                class="input"
                type="password"
                value={password.value}
                onInput={(ev: Event) => {
                  password.value = (ev.target as HTMLInputElement).value;
                }}
                required
              />
            </div>
            <button class="btn btn-primary" style="width:100%;justify-content:center" disabled={auth.loading}>
              {auth.loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  },
});

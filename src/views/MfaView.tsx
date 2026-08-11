import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

export default defineComponent({
  name: 'MfaView',
  setup() {
    const code = ref('');
    const auth = useAuthStore();
    const router = useRouter();
    const localError = ref<string | null>(null);

    async function onSubmit(e: Event) {
      e.preventDefault();
      localError.value = null;
      try {
        await auth.verifyMfa(code.value.trim());
        await router.push({ name: 'dashboard' });
      } catch {
        localError.value = auth.error || 'Invalid code';
      }
    }

    return () => (
      <div class="auth-page">
        <div class="card auth-card">
          <h1 style="margin:0 0 8px;font-size:24px">Two-factor authentication</h1>
          <p style="margin:0 0 24px;color:var(--muted);font-size:14px">
            Enter the 6-digit code sent to your email. In dev, check the auth-service console.
          </p>
          {localError.value && <div class="alert alert-error">{localError.value}</div>}
          <form onSubmit={onSubmit}>
            <div class="field">
              <label>Verification code</label>
              <input
                class="input"
                inputmode="numeric"
                maxlength={6}
                value={code.value}
                onInput={(ev: Event) => {
                  code.value = (ev.target as HTMLInputElement).value;
                }}
                placeholder="000000"
                required
              />
            </div>
            <button class="btn btn-primary" style="width:100%;justify-content:center" disabled={auth.loading}>
              {auth.loading ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        </div>
      </div>
    );
  },
});

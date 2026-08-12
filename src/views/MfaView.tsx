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
        localError.value = auth.error || 'Code invalide';
      }
    }

    return () => (
      <div class="auth-page">
        <div class="card auth-card">
          <div class="brand" style="padding:0 0 20px">
            <div class="brand-mark">CM</div>
            <div class="brand-text">
              <strong>Centaur Medical</strong>
              <span>Vérification MFA</span>
            </div>
          </div>
          <h1 style="margin:0 0 8px;font-size:24px">Double authentification</h1>
          <p style="margin:0 0 24px;color:var(--muted);font-size:14px">
            Saisissez le code à 6 chiffres envoyé par email. En local sans SMTP, le code apparaît
            dans la console du auth-service.
          </p>
          {localError.value && <div class="alert alert-error">{localError.value}</div>}
          <form onSubmit={onSubmit}>
            <div class="field">
              <label>Code de vérification</label>
              <input
                class="input"
                inputmode="numeric"
                maxlength={6}
                value={code.value}
                onInput={(ev: Event) => {
                  code.value = (ev.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6);
                }}
                placeholder="000000"
                required
              />
            </div>
            <button
              class="btn btn-primary"
              style="width:100%;justify-content:center"
              disabled={auth.loading}
            >
              {auth.loading ? 'Vérification…' : 'Valider'}
            </button>
          </form>
        </div>
      </div>
    );
  },
});

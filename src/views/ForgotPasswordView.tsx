import { defineComponent, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

type Step = 'email' | 'code' | 'password' | 'done';

export default defineComponent({
  name: 'ForgotPasswordView',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const auth = useAuthStore();

    const state = reactive({
      step: 'email' as Step,
      email: '',
      code: '',
      resetToken: '',
      newPassword: '',
      confirmPassword: '',
      localError: null as string | null,
      info: null as string | null,
      emailLocked: false,
    });

    async function sendCode(e?: Event) {
      e?.preventDefault();
      state.localError = null;
      state.info = null;
      const mail = state.email.trim();
      if (!mail) {
        state.localError = 'Email requis';
        return;
      }
      try {
        await auth.requestPasswordReset(mail);
        state.code = '';
        state.step = 'code';
        state.info = 'Un code à 6 chiffres vient d’être envoyé par email Centaur Medical.';
      } catch {
        state.localError = auth.error || 'Demande impossible';
      }
    }

    async function verifyCode(e: Event) {
      e.preventDefault();
      state.localError = null;
      state.info = null;
      try {
        state.resetToken = await auth.verifyResetCode(state.email.trim(), state.code.trim());
        state.step = 'password';
      } catch {
        state.localError = auth.error || 'Code invalide';
      }
    }

    async function savePassword(e: Event) {
      e.preventDefault();
      state.localError = null;
      state.info = null;
      if (state.newPassword !== state.confirmPassword) {
        state.localError = 'Les mots de passe ne correspondent pas';
        return;
      }
      try {
        await auth.resetPassword(state.resetToken, state.newPassword);
        state.step = 'done';
      } catch {
        state.localError = auth.error || 'Réinitialisation impossible';
      }
    }

    onMounted(() => {
      const q = route.query.email;
      const fromQuery = Array.isArray(q) ? String(q[0] || '') : String(q || '');
      if (fromQuery.trim()) {
        state.email = fromQuery.trim();
        state.emailLocked = true;
        void sendCode();
      }
    });

    return () => {
      const { step } = state;
      return (
        <div class="auth-page" data-forgot-version="code-v2">
          <div class="card auth-card">
            <div class="brand" style="padding:0 0 20px">
              <div class="brand-mark">CM</div>
              <div class="brand-text">
                <strong>Centaur Medical</strong>
                <span>Récupération du compte</span>
              </div>
            </div>

            {step === 'email' ? (
              <div key="step-email">
                <h1 style="margin:0 0 8px;font-size:22px">Mot de passe oublié</h1>
                <p style="margin:0 0 24px;color:var(--muted);font-size:14px">
                  Saisissez votre email. Un code à 6 chiffres vous sera envoyé.
                </p>
                {state.localError && <div class="alert alert-error">{state.localError}</div>}
                <form onSubmit={sendCode}>
                  <div class="field">
                    <label>Email</label>
                    <input
                      class="input"
                      type="email"
                      value={state.email}
                      onInput={(ev: Event) => {
                        state.email = (ev.target as HTMLInputElement).value;
                      }}
                      required
                      autocomplete="username"
                    />
                  </div>
                  <button
                    class="btn btn-primary"
                    style="width:100%;justify-content:center"
                    disabled={auth.loading}
                  >
                    {auth.loading ? 'Envoi…' : 'Envoyer le code'}
                  </button>
                </form>
              </div>
            ) : null}

            {step === 'code' ? (
              <div key="step-code">
                <h1 style="margin:0 0 8px;font-size:22px">Saisir le code</h1>
                <p style="margin:0 0 12px;color:var(--muted);font-size:14px">
                  Code envoyé à <strong>{state.email}</strong>
                </p>
                {state.info && <div class="alert alert-success">{state.info}</div>}
                {state.localError && <div class="alert alert-error">{state.localError}</div>}
                <form onSubmit={verifyCode}>
                  <div class="field">
                    <label>Email</label>
                    <input class="input" type="email" value={state.email} disabled />
                  </div>
                  <div class="field">
                    <label>Code à 6 chiffres</label>
                    <input
                      class="input"
                      type="text"
                      inputMode="numeric"
                      maxlength={6}
                      placeholder="123456"
                      value={state.code}
                      onInput={(ev: Event) => {
                        state.code = (ev.target as HTMLInputElement).value
                          .replace(/\D/g, '')
                          .slice(0, 6);
                      }}
                      required
                    />
                  </div>
                  <button
                    class="btn btn-primary"
                    style="width:100%;justify-content:center"
                    disabled={auth.loading || state.code.length !== 6}
                  >
                    {auth.loading ? 'Vérification…' : 'Valider le code'}
                  </button>
                </form>
                <button
                  type="button"
                  class="btn btn-ghost"
                  style="width:100%;justify-content:center;margin-top:12px"
                  disabled={auth.loading}
                  onClick={() => void sendCode()}
                >
                  Renvoyer le code
                </button>
              </div>
            ) : null}

            {step === 'password' ? (
              <div key="step-password">
                <h1 style="margin:0 0 8px;font-size:22px">Nouveau mot de passe</h1>
                <p style="margin:0 0 24px;color:var(--muted);font-size:14px">
                  Compte : <strong>{state.email}</strong>
                </p>
                {state.localError && <div class="alert alert-error">{state.localError}</div>}
                <form onSubmit={savePassword}>
                  <div class="field">
                    <label>Nouveau mot de passe</label>
                    <input
                      class="input"
                      type="password"
                      minLength={8}
                      value={state.newPassword}
                      onInput={(ev: Event) => {
                        state.newPassword = (ev.target as HTMLInputElement).value;
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
                      value={state.confirmPassword}
                      onInput={(ev: Event) => {
                        state.confirmPassword = (ev.target as HTMLInputElement).value;
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
                    {auth.loading ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </form>
              </div>
            ) : null}

            {step === 'done' ? (
              <div key="step-done">
                <h1 style="margin:0 0 8px;font-size:22px">Mot de passe mis à jour</h1>
                <div class="alert alert-success">
                  Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                </div>
                <button
                  class="btn btn-primary"
                  style="width:100%;justify-content:center"
                  onClick={() =>
                    router.push({
                      name: 'login',
                      query: state.email ? { email: state.email } : {},
                    })
                  }
                >
                  Se connecter
                </button>
              </div>
            ) : null}

            {step !== 'done' ? (
              <button
                type="button"
                class="btn btn-ghost"
                style="width:100%;justify-content:center;margin-top:12px"
                onClick={() =>
                  router.push({
                    name: 'login',
                    query: state.email ? { email: state.email } : {},
                  })
                }
              >
                Retour à la connexion
              </button>
            ) : null}
          </div>
        </div>
      );
    };
  },
});

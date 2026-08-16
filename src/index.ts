import { createApp, type App as VueApp } from 'vue';
import { createPinia } from 'pinia';
import CentaurMedicalApp from './App';
import { createAppRouter } from './router';
import { setUnauthorizedHandler } from './api/client';
import { useAuthStore } from './stores/auth';
import './styles/tokens.css';
import './styles/global.css';

export function createCentaurMedicalApp(): VueApp {
  const app = createApp(CentaurMedicalApp);
  app.config.errorHandler = (err, _instance, info) => {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Centaur Medical] render error');
      return;
    }
    console.error('[Centaur Medical]', err instanceof Error ? err.message : 'error', info);
  };
  const pinia = createPinia();
  app.use(pinia);
  setUnauthorizedHandler(() => {
    useAuthStore(pinia).logout();
  });
  app.use(createAppRouter());
  return app;
}

export { CentaurMedicalApp };
export default CentaurMedicalApp;

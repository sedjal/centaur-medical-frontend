import { createApp, type App as VueApp } from 'vue';
import { createPinia } from 'pinia';
import CentaurMedicalApp from './App';
import { createAppRouter } from './router';
import './styles/global.css';

export function createCentaurMedicalApp(): VueApp {
  const app = createApp(CentaurMedicalApp);
  app.use(createPinia());
  app.use(createAppRouter());
  return app;
}

export { CentaurMedicalApp };
export default CentaurMedicalApp;

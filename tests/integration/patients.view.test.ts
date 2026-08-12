/**
 * INTÉGRATION FE — PatientsView (liste + RBAC bouton créer)
 */
import '../setup-dom';
import test from 'tape';
import sinon from 'sinon';
import { h } from 'vue';
import api from '../../src/services/api';
import PatientsView from '../../src/views/PatientsView';
import { mountView, flushPromises, sessionUser } from './mount';

const samplePatient = {
  id: 'p1',
  patient_code: 'CM-001',
  first_name: 'Ahmed',
  last_name: 'Benali',
  hospitalization_date: '2026-08-11',
  service: 'URGENCE',
  status: 'CRITICAL',
};

test('intégration PatientsView: affiche la liste', async (t) => {
  const stub = sinon.stub(api, 'get').resolves({ data: [samplePatient] } as any);
  try {
    const { wrapper } = await mountView(PatientsView, {
      path: '/patients',
      authenticated: true,
      user: sessionUser({ permissions: ['patients:read'] }),
      routes: [
        { path: '/login', name: 'login', component: { setup: () => () => h('div', 'login') }, meta: { public: true } },
        { path: '/patients', name: 'patients', component: PatientsView },
        { path: '/patients/new', name: 'patient-create', component: { setup: () => () => h('div', 'new') } },
        { path: '/dashboard', name: 'dashboard', component: { setup: () => () => h('div', 'dash') } },
      ],
    });
    await flushPromises();

    t.match(wrapper.text(), /Ahmed/);
    t.match(wrapper.text(), /Benali/);
    t.match(wrapper.text(), /CM-001/);
    t.equal(wrapper.text().includes('Nouveau patient'), false);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientsView: patients:create affiche le bouton', async (t) => {
  const stub = sinon.stub(api, 'get').resolves({ data: [] } as any);
  try {
    const { wrapper } = await mountView(PatientsView, {
      path: '/patients',
      authenticated: true,
      user: sessionUser({ permissions: ['patients:read', 'patients:create'] }),
      routes: [
        { path: '/login', name: 'login', component: { setup: () => () => h('div', 'login') }, meta: { public: true } },
        { path: '/patients', name: 'patients', component: PatientsView },
        { path: '/patients/new', name: 'patient-create', component: { setup: () => () => h('div', 'new') } },
        { path: '/dashboard', name: 'dashboard', component: { setup: () => () => h('div', 'dash') } },
      ],
    });
    await flushPromises();

    t.match(wrapper.text(), /Nouveau patient/);
    t.match(wrapper.text(), /Aucun patient trouvé/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

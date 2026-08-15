/**
 * INTÉGRATION FE — PatientsView (liste + RBAC actions)
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

function patientRoutes() {
  return [
    { path: '/login', name: 'login', component: { setup: () => () => h('div', 'login') }, meta: { public: true } },
    {
      path: '/patients',
      name: 'patients',
      component: PatientsView,
      meta: { permission: 'patients:read' },
    },
    { path: '/patients/new', name: 'patient-create', component: { setup: () => () => h('div', 'new') } },
    {
      path: '/patients/:id/edit',
      name: 'patient-edit',
      component: { setup: () => () => h('div', 'edit') },
    },
    {
      path: '/patients/:id',
      name: 'patient-detail',
      component: { setup: () => () => h('div', { 'data-page': 'detail' }, 'detail') },
    },
    { path: '/dashboard', name: 'dashboard', component: { setup: () => () => h('div', 'dash') } },
  ];
}

test('intégration PatientsView: affiche la liste + Voir (patients:read)', async (t) => {
  const stub = sinon.stub(api, 'get').resolves({ data: [samplePatient] } as any);
  try {
    const { wrapper } = await mountView(PatientsView, {
      path: '/patients',
      authenticated: true,
      user: sessionUser({ permissions: ['patients:read', 'service:urgence'] }),
      routes: patientRoutes(),
    });
    await flushPromises();

    t.match(wrapper.text(), /Ahmed/);
    t.match(wrapper.text(), /BENALI/);
    t.match(wrapper.text(), /CM-001/);
    t.match(wrapper.text(), /Voir/);
    t.equal(wrapper.text().includes('Modifier'), false);
    t.equal(wrapper.text().includes('Supprimer'), false);
    t.equal(wrapper.text().includes('Ajouter un patient'), false);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientsView: patients:create affiche Ajouter', async (t) => {
  const stub = sinon.stub(api, 'get').resolves({ data: [] } as any);
  try {
    const { wrapper } = await mountView(PatientsView, {
      path: '/patients',
      authenticated: true,
      user: sessionUser({
        permissions: ['patients:read', 'patients:create', 'service:urgence'],
      }),
      routes: patientRoutes(),
    });
    await flushPromises();

    t.match(wrapper.text(), /Ajouter un patient/);
    t.match(wrapper.text(), /Aucun patient trouvé/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientsView: patients:update affiche Modifier', async (t) => {
  const stub = sinon.stub(api, 'get').resolves({ data: [samplePatient] } as any);
  try {
    const { wrapper } = await mountView(PatientsView, {
      path: '/patients',
      authenticated: true,
      user: sessionUser({
        permissions: ['patients:read', 'patients:update', 'service:urgence'],
      }),
      routes: patientRoutes(),
    });
    await flushPromises();

    t.match(wrapper.text(), /Voir/);
    t.match(wrapper.text(), /Modifier/);
    t.equal(wrapper.text().includes('Supprimer'), false);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientsView: patients:delete affiche Supprimer', async (t) => {
  const stub = sinon.stub(api, 'get').resolves({ data: [samplePatient] } as any);
  try {
    const { wrapper } = await mountView(PatientsView, {
      path: '/patients',
      authenticated: true,
      user: sessionUser({
        permissions: ['patients:read', 'patients:delete', 'service:urgence'],
      }),
      routes: patientRoutes(),
    });
    await flushPromises();

    t.match(wrapper.text(), /Voir/);
    t.match(wrapper.text(), /Supprimer/);
    t.equal(wrapper.text().includes('Modifier'), false);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientsView: filtre service limité aux permissions', async (t) => {
  const stub = sinon.stub(api, 'get').resolves({ data: [] } as any);
  try {
    const { wrapper } = await mountView(PatientsView, {
      path: '/patients',
      authenticated: true,
      user: sessionUser({
        permissions: ['patients:read', 'service:urgence'],
      }),
      routes: patientRoutes(),
    });
    await flushPromises();

    const options = wrapper.findAll('select option').map((o) => o.text());
    t.ok(options.some((o) => /Urgence/i.test(o)));
    t.equal(options.some((o) => /Cardiologie/i.test(o)), false);
    t.equal(options.some((o) => /Oncologie/i.test(o)), false);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientsView: Voir navigue vers patient-detail', async (t) => {
  const stub = sinon.stub(api, 'get').resolves({ data: [samplePatient] } as any);
  try {
    const { wrapper, router } = await mountView(PatientsView, {
      path: '/patients',
      authenticated: true,
      user: sessionUser({ permissions: ['patients:read', 'service:urgence'] }),
      routes: patientRoutes(),
    });
    await flushPromises();

    const voir = wrapper.findAll('button').find((b) => b.text().trim() === 'Voir');
    t.ok(voir);
    await voir!.trigger('click');
    await flushPromises();
    t.equal(router.currentRoute.value.name, 'patient-detail');
    t.equal(router.currentRoute.value.params.id, 'p1');
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientsView: ConfirmDialog suppression', async (t) => {
  const getStub = sinon.stub(api, 'get').resolves({ data: [samplePatient] } as any);
  const delStub = sinon.stub(api, 'delete').resolves({ data: { ok: true } } as any);
  try {
    const { wrapper } = await mountView(PatientsView, {
      path: '/patients',
      authenticated: true,
      user: sessionUser({
        permissions: ['patients:read', 'patients:delete', 'service:urgence'],
      }),
      routes: patientRoutes(),
    });
    await flushPromises();

    const delBtn = wrapper.findAll('button').find((b) => b.text().trim() === 'Supprimer');
    t.ok(delBtn);
    await delBtn!.trigger('click');
    await flushPromises();

    t.match(wrapper.text(), /Êtes-vous sûr de vouloir supprimer ce patient/);
    const confirm = wrapper.find('.cm-confirm__actions .cm-btn--danger');
    t.ok(confirm.exists());
    await confirm.trigger('click');
    await flushPromises();

    t.ok(delStub.calledOnce);
    wrapper.unmount();
  } finally {
    getStub.restore();
    delStub.restore();
    t.end();
  }
});

test('intégration PatientsView: erreur API + retry', async (t) => {
  const stub = sinon.stub(api, 'get');
  stub.onFirstCall().rejects({ response: { status: 500, data: { error: 'boom' } } });
  stub.onSecondCall().resolves({ data: [samplePatient] } as any);
  try {
    const { wrapper } = await mountView(PatientsView, {
      path: '/patients',
      authenticated: true,
      user: sessionUser({ permissions: ['patients:read', 'service:urgence'] }),
      routes: patientRoutes(),
    });
    await flushPromises();

    t.match(wrapper.text(), /Impossible de charger|erreur serveur|Réessayer/i);
    const retry = wrapper.findAll('button').find((b) => /Réessayer/i.test(b.text()));
    t.ok(retry);
    await retry!.trigger('click');
    await flushPromises();
    t.match(wrapper.text(), /Ahmed|BENALI|CM-001/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

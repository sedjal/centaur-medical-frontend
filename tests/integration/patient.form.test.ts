/**
 * INTÉGRATION FE — PatientFormView (CREATE / EDIT)
 */
import '../setup-dom';
import test from 'tape';
import sinon from 'sinon';
import { h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory } from 'vue-router';
import api from '../../src/services/api';
import PatientFormView from '../../src/views/PatientFormView';
import PatientDetailView from '../../src/views/PatientDetailView';
import { createAppRouter } from '../../src/router';
import { useAuthStore } from '../../src/stores/auth';
import { mountView, sessionUser } from './mount';

function basePatient(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    patient_code: 'PT-000124',
    first_name: 'Ahmed',
    last_name: 'Benali',
    hospitalization_date: '2026-08-11',
    service: 'GENERAL',
    status: 'STABLE',
    specialty: { notes: 'Suivi' },
    ...overrides,
  };
}

function formRoutes() {
  return [
    {
      path: '/login',
      name: 'login',
      component: { setup: () => () => h('div', 'login') },
      meta: { public: true },
    },
    { path: '/dashboard', name: 'dashboard', component: { setup: () => () => h('div', 'dash') } },
    { path: '/patients', name: 'patients', component: { setup: () => () => h('div', 'list') } },
    {
      path: '/patients/new',
      name: 'patient-create',
      component: PatientFormView,
      meta: { permission: 'patients:create' },
    },
    {
      path: '/patients/:id/edit',
      name: 'patient-edit',
      component: PatientFormView,
      meta: { permission: 'patients:update' },
    },
    {
      path: '/patients/:id',
      name: 'patient-detail',
      component: { setup: () => () => h('div', { 'data-page': 'detail' }, 'detail') },
      meta: { permission: 'patients:read' },
    },
  ];
}

async function mountCreate(permissions: string[]) {
  return mountView(PatientFormView, {
    path: '/patients/new',
    authenticated: true,
    user: sessionUser({
      permissions: permissions as never,
    }),
    routes: formRoutes(),
  });
}

async function mountEdit(
  permissions: string[],
  patientData: Record<string, unknown> | null,
  options?: { rejectStatus?: number }
) {
  let getStub: sinon.SinonStub;
  if (options?.rejectStatus) {
    getStub = sinon.stub(api, 'get').rejects({
      response: { status: options.rejectStatus, data: { error: 'err' } },
    });
  } else {
    getStub = sinon.stub(api, 'get').resolves({ data: patientData } as any);
  }

  const mounted = await mountView(PatientFormView, {
    path: '/patients/p1/edit',
    authenticated: true,
    user: sessionUser({ permissions: permissions as never }),
    routes: formRoutes(),
  });
  await flushPromises();
  return { ...mounted, getStub };
}

function setInputByLabel(wrapper: { findAll: (s: string) => any[] }, labelText: string, value: string) {
  const fields = wrapper.findAll('.cm-field');
  const field = fields.find((f) => {
    const label = f.find('label');
    return label.exists() && label.text().includes(labelText);
  });
  if (!field) throw new Error(`Field not found: ${labelText}`);
  const input = field.find('input, textarea, select');
  return input.setValue(value);
}

async function bootRouter(permissions: string[]) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createAppRouter(createMemoryHistory());
  const auth = useAuthStore();
  auth.setSession(
    'access-jwt',
    sessionUser({ permissions: permissions as never })
  );
  const wrapper = mount(
    { name: 'Root', setup: () => () => h('div', 'root') },
    { global: { plugins: [pinia, router] } }
  );
  await router.isReady();
  return { wrapper, router, auth };
}

// ——— CREATE ———

test('intégration PatientForm CREATE: accessible avec patients:create', async (t) => {
  localStorage.clear();
  try {
    const { wrapper, router } = await bootRouter([
      'patients:create',
      'service:general',
      'patients:read',
    ]);
    await router.push('/patients/new');
    await flushPromises();
    t.equal(router.currentRoute.value.name, 'patient-create');
    wrapper.unmount();
  } finally {
    t.end();
  }
});

test('intégration PatientForm CREATE: refusé sans patients:create', async (t) => {
  localStorage.clear();
  try {
    const { wrapper, router } = await bootRouter(['patients:read', 'service:general']);
    await router.push('/patients/new');
    await flushPromises();
    t.equal(router.currentRoute.value.name, 'dashboard');
    wrapper.unmount();
  } finally {
    t.end();
  }
});

test('intégration PatientForm CREATE: affiche champs nécessaires', async (t) => {
  const { wrapper } = await mountCreate([
    'patients:create',
    'patients:read',
    'service:general',
    'service:urgence',
  ]);
  try {
    const text = wrapper.text();
    t.match(text, /Nouveau patient/);
    t.match(text, /Informations patient/);
    t.match(text, /Hospitalisation/);
    t.match(text, /Données médicales/);
    t.match(text, /Nom/);
    t.match(text, /Prénom/);
    t.match(text, /Service/);
    t.match(text, /Statut/);
    t.match(text, /hospitalisation/i);
    t.match(text, /Notes/);
    t.equal(text.toLowerCase().includes('date de naissance'), false);
    t.equal(text.toLowerCase().includes('téléphone'), false);
    wrapper.unmount();
  } finally {
    t.end();
  }
});

test('intégration PatientForm CREATE: validation champs obligatoires', async (t) => {
  const postStub = sinon.stub(api, 'post');
  const { wrapper } = await mountCreate([
    'patients:create',
    'service:general',
  ]);
  try {
    await setInputByLabel(wrapper, 'Nom', '');
    await setInputByLabel(wrapper, 'Prénom', '');
    const form = wrapper.find('form.patient-form');
    await form.trigger('submit');
    await flushPromises();
    t.match(wrapper.text(), /nom est obligatoire/i);
    t.match(wrapper.text(), /prénom est obligatoire/i);
    t.equal(postStub.called, false);
    wrapper.unmount();
  } finally {
    postStub.restore();
    t.end();
  }
});

test('intégration PatientForm CREATE: POST + loading + redirect détail', async (t) => {
  let resolvePost: (v: unknown) => void = () => undefined;
  const postStub = sinon.stub(api, 'post').returns(
    new Promise((resolve) => {
      resolvePost = resolve;
    }) as any
  );

  const { wrapper, router } = await mountCreate([
    'patients:create',
    'patients:read',
    'service:general',
  ]);
  try {
    await setInputByLabel(wrapper, 'Nom', 'Benali');
    await setInputByLabel(wrapper, 'Prénom', 'Sara');
    await setInputByLabel(wrapper, "Date d'hospitalisation", '2026-08-12');

    const submitBtn = wrapper.find('button[type="submit"]');
    await wrapper.find('form.patient-form').trigger('submit');
    await flushPromises();

    t.ok(submitBtn.attributes('disabled') !== undefined || submitBtn.attributes('aria-busy') === 'true');

    resolvePost({ data: basePatient({ id: 'new-1', first_name: 'Sara', last_name: 'Benali' }) });
    await flushPromises();

    t.ok(postStub.calledOnce);
    const [, body] = postStub.firstCall.args;
    t.equal(body.firstName, 'Sara');
    t.equal(body.lastName, 'Benali');
    t.equal(body.service, 'GENERAL');
    t.equal(router.currentRoute.value.name, 'patient-detail');
    t.equal(router.currentRoute.value.params.id, 'new-1');
    wrapper.unmount();
  } finally {
    postStub.restore();
    t.end();
  }
});

test('intégration PatientForm CREATE: erreur API affichée', async (t) => {
  const postStub = sinon.stub(api, 'post').rejects({
    response: { status: 500, data: { error: 'boom' } },
  });
  const { wrapper } = await mountCreate(['patients:create', 'service:general']);
  try {
    await setInputByLabel(wrapper, 'Nom', 'Benali');
    await setInputByLabel(wrapper, 'Prénom', 'Sara');
    await wrapper.find('form.patient-form').trigger('submit');
    await flushPromises();
    t.match(wrapper.text(), /erreur est survenue lors de l'enregistrement/i);
    wrapper.unmount();
  } finally {
    postStub.restore();
    t.end();
  }
});

test('intégration PatientForm CREATE: Annuler → /patients', async (t) => {
  const { wrapper, router } = await mountCreate(['patients:create', 'service:general']);
  try {
    const cancel = wrapper.findAll('button').find((b) => b.text().trim() === 'Annuler');
    t.ok(cancel);
    await cancel!.trigger('click');
    await flushPromises();
    t.equal(router.currentRoute.value.name, 'patients');
    wrapper.unmount();
  } finally {
    t.end();
  }
});

// ——— EDIT ———

test('intégration PatientForm EDIT: accessible avec patients:update', async (t) => {
  localStorage.clear();
  try {
    const { wrapper, router } = await bootRouter([
      'patients:update',
      'patients:read',
      'service:general',
    ]);
    await router.push('/patients/p1/edit');
    await flushPromises();
    t.equal(router.currentRoute.value.name, 'patient-edit');
    wrapper.unmount();
  } finally {
    t.end();
  }
});

test('intégration PatientForm EDIT: refusé sans patients:update', async (t) => {
  localStorage.clear();
  try {
    const { wrapper, router } = await bootRouter(['patients:read', 'service:general']);
    await router.push('/patients/p1/edit');
    await flushPromises();
    t.equal(router.currentRoute.value.name, 'dashboard');
    wrapper.unmount();
  } finally {
    t.end();
  }
});

test('intégration PatientForm EDIT: GET + formulaire pré-rempli', async (t) => {
  const { wrapper, getStub } = await mountEdit(
    ['patients:update', 'patients:read', 'service:general'],
    basePatient()
  );
  try {
    t.ok(getStub.calledWith('/patients/p1'));
    t.match(wrapper.text(), /Modifier le patient/);
    const nom = wrapper.findAll('input.cm-input').find((i) => (i.element as HTMLInputElement).value === 'Benali');
    const prenom = wrapper.findAll('input.cm-input').find((i) => (i.element as HTMLInputElement).value === 'Ahmed');
    const code = wrapper
      .findAll('input.cm-input')
      .find((i) => (i.element as HTMLInputElement).value === 'PT-000124');
    t.ok(nom);
    t.ok(prenom);
    t.ok(code);
    wrapper.unmount();
  } finally {
    getStub.restore();
    t.end();
  }
});

test('intégration PatientForm EDIT: PUT + redirect détail', async (t) => {
  const { wrapper, router, getStub } = await mountEdit(
    ['patients:update', 'patients:read', 'service:general'],
    basePatient()
  );
  const putStub = sinon.stub(api, 'put').resolves({
    data: basePatient({ first_name: 'Amine' }),
  } as any);
  try {
    await setInputByLabel(wrapper, 'Prénom', 'Amine');
    await wrapper.find('form.patient-form').trigger('submit');
    await flushPromises();
    t.ok(putStub.calledOnce);
    t.ok(putStub.calledWith('/patients/p1'));
    const body = putStub.firstCall.args[1];
    t.equal(body.firstName, 'Amine');
    t.equal(router.currentRoute.value.name, 'patient-detail');
    t.equal(router.currentRoute.value.params.id, 'p1');
    wrapper.unmount();
  } finally {
    getStub.restore();
    putStub.restore();
    t.end();
  }
});

test('intégration PatientForm EDIT: erreur 403 affichée', async (t) => {
  const { wrapper, getStub } = await mountEdit(
    ['patients:update', 'service:general'],
    basePatient()
  );
  const putStub = sinon.stub(api, 'put').rejects({
    response: { status: 403, data: { error: 'Forbidden' } },
  });
  try {
    await setInputByLabel(wrapper, 'Prénom', 'Amine');
    await wrapper.find('form.patient-form').trigger('submit');
    await flushPromises();
    t.match(wrapper.text(), /autorisation de modifier/i);
    wrapper.unmount();
  } finally {
    getStub.restore();
    putStub.restore();
    t.end();
  }
});

test('intégration PatientForm EDIT: erreur 404 au chargement', async (t) => {
  const { wrapper, getStub } = await mountEdit(
    ['patients:update', 'service:general'],
    null,
    { rejectStatus: 404 }
  );
  try {
    t.match(wrapper.text(), /introuvable/i);
    wrapper.unmount();
  } finally {
    getStub.restore();
    t.end();
  }
});

test('intégration PatientForm EDIT: Annuler → /patients/:id', async (t) => {
  const { wrapper, router, getStub } = await mountEdit(
    ['patients:update', 'patients:read', 'service:general'],
    basePatient()
  );
  try {
    const cancel = wrapper.findAll('button').find((b) => b.text().trim() === 'Annuler');
    await cancel!.trigger('click');
    await flushPromises();
    t.equal(router.currentRoute.value.name, 'patient-detail');
    t.equal(router.currentRoute.value.params.id, 'p1');
    wrapper.unmount();
  } finally {
    getStub.restore();
    t.end();
  }
});

test('intégration PatientForm EDIT: service URGENCE affiche champs spécialisés', async (t) => {
  const { wrapper, getStub } = await mountEdit(
    ['patients:update', 'service:urgence', 'service:general'],
    basePatient({
      service: 'URGENCE',
      specialty: {
        arrival_time: '08:30',
        triage_level: '2',
        initial_severity: 'Modérée',
      },
    })
  );
  try {
    t.match(wrapper.text(), /Heure d'arrivée/);
    t.match(wrapper.text(), /Niveau de triage/);
    t.match(wrapper.text(), /Sévérité initiale/);
    t.equal(wrapper.text().includes('Type de tumeur'), false);
    wrapper.unmount();
  } finally {
    getStub.restore();
    t.end();
  }
});

// ——— ROUTES / RBAC DETAIL ———

test('intégration routes: /patients/:id = PatientDetailView, edit/new = PatientFormView', async (t) => {
  localStorage.clear();
  try {
    const { wrapper, router } = await bootRouter([
      'patients:read',
      'patients:create',
      'patients:update',
      'service:general',
    ]);

    const detail = router.resolve('/patients/p1');
    t.equal(detail.name, 'patient-detail');
    const detailComp = detail.matched[detail.matched.length - 1]?.components?.default;
    t.equal(detailComp, PatientDetailView);

    const edit = router.resolve('/patients/p1/edit');
    t.equal(edit.name, 'patient-edit');
    const editComp = edit.matched[edit.matched.length - 1]?.components?.default;
    t.equal(editComp, PatientFormView);

    const create = router.resolve('/patients/new');
    t.equal(create.name, 'patient-create');
    const createComp = create.matched[create.matched.length - 1]?.components?.default;
    t.equal(createComp, PatientFormView);

    wrapper.unmount();
  } finally {
    t.end();
  }
});

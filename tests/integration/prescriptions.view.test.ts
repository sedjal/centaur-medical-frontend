/**
 * INTÉGRATION FE — PrescriptionsView + PatientDetail ordonnances
 */
import '../setup-dom';
import test from 'tape';
import sinon from 'sinon';
import { h } from 'vue';
import api from '../../src/services/api';
import PrescriptionsView from '../../src/views/PrescriptionsView';
import PatientDetailView from '../../src/views/PatientDetailView';
import { mountView, flushPromises, sessionUser } from './mount';

const sampleRx = {
  id: 'rx1',
  patientId: 'p1',
  doctorId: 'u-urg',
  doctorName: 'Léa Urg',
  prescribedAt: '2026-08-12T14:30:00.000Z',
  status: 'ACTIVE',
  notes: 'Antalgique',
  medications: [
    {
      id: 'm1',
      name: 'Paracétamol',
      dosage: '1g',
      frequency: '3x/jour',
      duration: '5 jours',
      instructions: 'Après repas',
    },
  ],
};

const samplePatient = {
  id: 'p1',
  patient_code: 'PT-000124',
  first_name: 'Ahmed',
  last_name: 'Benali',
  hospitalization_date: '2026-08-11',
  service: 'URGENCE',
  status: 'STABLE',
  specialty: { arrival_time: '08:30', triage_level: '2', initial_severity: 'Modérée' },
};

function rxRoutes() {
  return [
    {
      path: '/login',
      name: 'login',
      component: { setup: () => () => h('div', 'login') },
      meta: { public: true },
    },
    { path: '/dashboard', name: 'dashboard', component: { setup: () => () => h('div', 'dash') } },
    {
      path: '/prescriptions',
      name: 'prescriptions',
      component: PrescriptionsView,
      meta: { permission: 'prescriptions:read' },
    },
    {
      path: '/patients/:id',
      name: 'patient-detail',
      component: PatientDetailView,
      meta: { permission: 'patients:read' },
    },
  ];
}

function stubGets(rxData: unknown, patientData: unknown = samplePatient) {
  return sinon.stub(api, 'get').callsFake((url: string) => {
    const path = String(url);
    if (path.includes('/prescriptions')) {
      return Promise.resolve({ data: rxData } as any);
    }
    return Promise.resolve({ data: patientData } as any);
  });
}

test('intégration PrescriptionsView: liste + Voir (prescriptions:read)', async (t) => {
  const stub = stubGets([sampleRx]);
  try {
    const { wrapper } = await mountView(PrescriptionsView, {
      path: '/prescriptions',
      authenticated: true,
      user: sessionUser({
        permissions: ['prescriptions:read', 'service:urgence'] as never,
      }),
      routes: rxRoutes(),
    });
    await flushPromises();
    t.match(wrapper.text(), /Paracétamol|Léa Urg|Active/);
    t.match(wrapper.text(), /Voir/);
    t.equal(wrapper.text().includes('Nouvelle ordonnance'), false);
    t.equal(wrapper.text().includes('Annuler'), false);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PrescriptionsView: empty state', async (t) => {
  const stub = stubGets([]);
  try {
    const { wrapper } = await mountView(PrescriptionsView, {
      path: '/prescriptions',
      authenticated: true,
      user: sessionUser({ permissions: ['prescriptions:read', 'service:urgence'] as never }),
      routes: rxRoutes(),
    });
    await flushPromises();
    t.match(wrapper.text(), /Aucune ordonnance/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PrescriptionsView: LoadingState', async (t) => {
  const stub = sinon.stub(api, 'get').returns(new Promise(() => undefined) as any);
  try {
    const { wrapper } = await mountView(PrescriptionsView, {
      path: '/prescriptions',
      authenticated: true,
      user: sessionUser({ permissions: ['prescriptions:read', 'service:urgence'] as never }),
      routes: rxRoutes(),
    });
    t.match(wrapper.text(), /Chargement des ordonnances/i);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PrescriptionsView: ErrorState + Réessayer', async (t) => {
  const stub = sinon.stub(api, 'get');
  stub.onFirstCall().rejects({ response: { status: 500, data: { error: 'boom' } } });
  stub.onSecondCall().resolves({ data: [sampleRx] } as any);
  try {
    const { wrapper } = await mountView(PrescriptionsView, {
      path: '/prescriptions',
      authenticated: true,
      user: sessionUser({ permissions: ['prescriptions:read', 'service:urgence'] as never }),
      routes: rxRoutes(),
    });
    await flushPromises();
    t.match(wrapper.text(), /Impossible de charger|erreur/i);
    const retry = wrapper.findAll('button').find((b) => /Réessayer/i.test(b.text()));
    t.ok(retry);
    await retry!.trigger('click');
    await flushPromises();
    t.match(wrapper.text(), /Paracétamol|Léa Urg/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PrescriptionsView: create visible + POST sans doctorId', async (t) => {
  const getStub = stubGets([sampleRx], [samplePatient]);
  const postStub = sinon.stub(api, 'post').resolves({ data: sampleRx } as any);
  try {
    const { wrapper } = await mountView(PrescriptionsView, {
      path: '/prescriptions',
      authenticated: true,
      user: sessionUser({
        permissions: [
          'prescriptions:read',
          'prescriptions:create',
          'patients:read',
          'service:urgence',
        ] as never,
      }),
      routes: rxRoutes(),
    });
    await flushPromises();
    t.match(wrapper.text(), /Nouvelle ordonnance/);

    const createBtn = wrapper.findAll('button').find((b) => /Nouvelle ordonnance/.test(b.text()));
    await createBtn!.trigger('click');
    await flushPromises();
    t.match(wrapper.text(), /Créer l'ordonnance/);
    t.match(wrapper.text(), /Médicament/);

    const form = wrapper.find('form.rx-form');
    await form.trigger('submit');
    await flushPromises();
    t.match(wrapper.text(), /obligatoire/i);
    t.equal(postStub.called, false);

    const fields = wrapper.findAll('.cm-field');
    async function setByLabel(label: string, value: string) {
      const field = fields.filter((f) => f.find('label').exists() && f.find('label').text().includes(label));
      const last = field[field.length - 1];
      if (!last) throw new Error(label);
      const input = last.find('input');
      await input.setValue(value);
    }
    await setByLabel('Médicament', 'Ibuprofène');
    await setByLabel('Dosage', '400mg');
    await setByLabel('Fréquence', '2x/jour');
    await setByLabel('Durée', '3 jours');
    await wrapper.find('form.rx-form').trigger('submit');
    await flushPromises();

    t.ok(postStub.calledOnce);
    const body = postStub.firstCall.args[1];
    t.equal(body.patientId, 'p1');
    t.equal(Object.prototype.hasOwnProperty.call(body, 'doctorId'), false);
    t.equal(body.medications[0].name, 'Ibuprofène');
    wrapper.unmount();
  } finally {
    getStub.restore();
    postStub.restore();
    t.end();
  }
});

test('intégration PrescriptionsView: cancel + confirmation PATCH', async (t) => {
  const getStub = stubGets([sampleRx]);
  const patchStub = sinon.stub(api, 'patch').resolves({
    data: { ...sampleRx, status: 'CANCELLED' },
  } as any);
  try {
    const { wrapper } = await mountView(PrescriptionsView, {
      path: '/prescriptions',
      authenticated: true,
      user: sessionUser({
        permissions: ['prescriptions:read', 'prescriptions:cancel', 'service:urgence'] as never,
      }),
      routes: rxRoutes(),
    });
    await flushPromises();
    t.match(wrapper.text(), /Annuler/);
    const cancelBtn = wrapper
      .findAll('button')
      .find((b) => b.text().trim() === 'Annuler' || /Annuler l'ordonnance/.test(b.text()));
    t.ok(cancelBtn);
    await cancelBtn!.trigger('click');
    await flushPromises();
    t.match(wrapper.text(), /Êtes-vous sûr de vouloir annuler cette ordonnance/);
    const confirm = wrapper.find('.cm-confirm__actions .cm-btn--danger');
    await confirm.trigger('click');
    await flushPromises();
    t.ok(patchStub.calledWith('/prescriptions/rx1/cancel'));
    wrapper.unmount();
  } finally {
    getStub.restore();
    patchStub.restore();
    t.end();
  }
});

test('intégration PatientDetail: ordonnances dans dossier (prescriptions:read)', async (t) => {
  const stub = stubGets([sampleRx], samplePatient);
  try {
    const { wrapper } = await mountView(PatientDetailView, {
      path: '/patients/p1',
      authenticated: true,
      user: sessionUser({
        permissions: ['patients:read', 'prescriptions:read', 'service:urgence'] as never,
      }),
      routes: rxRoutes(),
    });
    await flushPromises();
    const dossierTab = wrapper.findAll('button').find((b) => /Dossier médical/.test(b.text()));
    await dossierTab!.trigger('click');
    await flushPromises();
    t.ok(stub.calledWith('/patients/p1/prescriptions'));
    t.match(wrapper.text(), /Ordonnances/);
    t.match(wrapper.text(), /Paracétamol/);
    t.equal(wrapper.text().includes('Nouvelle ordonnance'), false);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientDetail: sans prescriptions:read → pas de contenu ordonnance', async (t) => {
  const stub = stubGets([sampleRx], samplePatient);
  try {
    const { wrapper } = await mountView(PatientDetailView, {
      path: '/patients/p1',
      authenticated: true,
      user: sessionUser({ permissions: ['patients:read', 'service:urgence'] as never }),
      routes: rxRoutes(),
    });
    await flushPromises();
    const dossierTab = wrapper.findAll('button').find((b) => /Dossier médical/.test(b.text()));
    await dossierTab!.trigger('click');
    await flushPromises();
    t.equal(stub.calledWith('/patients/p1/prescriptions'), false);
    t.match(wrapper.text(), /autorisation de consulter les ordonnances/i);
    t.equal(wrapper.text().includes('Paracétamol'), false);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientDetail: prescriptions:create affiche Nouvelle ordonnance', async (t) => {
  const stub = stubGets([], samplePatient);
  try {
    const { wrapper } = await mountView(PatientDetailView, {
      path: '/patients/p1',
      authenticated: true,
      user: sessionUser({
        permissions: [
          'patients:read',
          'prescriptions:read',
          'prescriptions:create',
          'service:urgence',
        ] as never,
      }),
      routes: rxRoutes(),
    });
    await flushPromises();
    const dossierTab = wrapper.findAll('button').find((b) => /Dossier médical/.test(b.text()));
    await dossierTab!.trigger('click');
    await flushPromises();
    t.match(wrapper.text(), /Nouvelle ordonnance/);
    t.match(wrapper.text(), /Aucune ordonnance/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

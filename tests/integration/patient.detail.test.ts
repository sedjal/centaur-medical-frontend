/**
 * INTÉGRATION FE — PatientDetailView (dossier médical lecture)
 */
import '../setup-dom';
import test from 'tape';
import sinon from 'sinon';
import { h } from 'vue';
import api from '../../src/services/api';
import PatientDetailView from '../../src/views/PatientDetailView';
import { mountView, flushPromises, sessionUser } from './mount';

function basePatient(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    patient_code: 'CM-001',
    first_name: 'Ahmed',
    last_name: 'Benali',
    hospitalization_date: '2026-08-11',
    service: 'URGENCE',
    status: 'STABLE',
    medicalRecord: { id: 'mr1', service: 'URGENCE' },
    specialty: {
      arrival_time: '08:30',
      triage_level: '2',
      initial_severity: 'Modérée',
    },
    ...overrides,
  };
}

function detailRoutes() {
  return [
    { path: '/login', name: 'login', component: { setup: () => () => h('div', 'login') }, meta: { public: true } },
    { path: '/patients', name: 'patients', component: { setup: () => () => h('div', 'list') } },
    {
      path: '/patients/:id/edit',
      name: 'patient-edit',
      component: { setup: () => () => h('div', { 'data-page': 'edit' }, 'edit') },
    },
    {
      path: '/patients/:id',
      name: 'patient-detail',
      component: PatientDetailView,
      meta: { permission: 'patients:read' },
    },
    { path: '/dashboard', name: 'dashboard', component: { setup: () => () => h('div', 'dash') } },
  ];
}

async function mountDetail(
  permissions: string[],
  patientData: Record<string, unknown> | null,
  options?: { rejectStatus?: number }
) {
  let stub: sinon.SinonStub;
  if (options?.rejectStatus) {
    stub = sinon.stub(api, 'get').rejects({
      response: { status: options.rejectStatus, data: { error: 'err' } },
    });
  } else {
    stub = sinon.stub(api, 'get').resolves({ data: patientData } as any);
  }

  const mounted = await mountView(PatientDetailView, {
    path: '/patients/p1',
    authenticated: true,
    user: sessionUser({ permissions: permissions as never }),
    routes: detailRoutes(),
  });
  await flushPromises();
  return { ...mounted, stub };
}

test('intégration PatientDetail: patients:read charge GET /patients/:id', async (t) => {
  const { wrapper, stub } = await mountDetail(
    ['patients:read', 'service:urgence'],
    basePatient()
  );
  try {
    t.ok(stub.calledWith('/patients/p1'));
    t.match(wrapper.text(), /BENALI/);
    t.match(wrapper.text(), /Ahmed/);
    t.match(wrapper.text(), /CM-001/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientDetail: onglet Informations affiche champs généraux', async (t) => {
  const { wrapper, stub } = await mountDetail(
    ['patients:read', 'service:urgence'],
    basePatient()
  );
  try {
    t.match(wrapper.text(), /Informations/);
    t.match(wrapper.text(), /Code patient/);
    t.match(wrapper.text(), /Hospitalisation|hospitalisation/i);
    t.equal(wrapper.text().includes('date de naissance'), false);
    t.equal(wrapper.text().includes('téléphone'), false);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientDetail: URGENCE affiche specialty', async (t) => {
  const { wrapper, stub } = await mountDetail(
    ['patients:read', 'service:urgence'],
    basePatient()
  );
  try {
    const dossierTab = wrapper.findAll('button').find((b) => /Dossier médical/.test(b.text()));
    t.ok(dossierTab);
    await dossierTab!.trigger('click');
    await flushPromises();
    t.match(wrapper.text(), /08:30|Heure d'arrivée/);
    t.match(wrapper.text(), /triage|2/i);
    t.match(wrapper.text(), /Modérée|Sévérité/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientDetail: GENERAL affiche notes', async (t) => {
  const { wrapper, stub } = await mountDetail(
    ['patients:read', 'service:general'],
    basePatient({
      service: 'GENERAL',
      medicalRecord: { id: 'mr1', service: 'GENERAL' },
      specialty: { notes: 'Suivi post-opératoire' },
    })
  );
  try {
    const dossierTab = wrapper.findAll('button').find((b) => /Dossier médical/.test(b.text()));
    await dossierTab!.trigger('click');
    await flushPromises();
    t.match(wrapper.text(), /Notes/);
    t.match(wrapper.text(), /Suivi post-opératoire/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientDetail: ONCOLOGIE affiche specialty', async (t) => {
  const { wrapper, stub } = await mountDetail(
    ['patients:read', 'service:oncologie'],
    basePatient({
      service: 'ONCOLOGIE',
      medicalRecord: { id: 'mr1', service: 'ONCOLOGIE' },
      specialty: { tumor_type: 'Carcinome', stage: 'II', current_treatment: 'Chimio' },
    })
  );
  try {
    const dossierTab = wrapper.findAll('button').find((b) => /Dossier médical/.test(b.text()));
    await dossierTab!.trigger('click');
    await flushPromises();
    t.match(wrapper.text(), /Carcinome/);
    t.match(wrapper.text(), /II/);
    t.match(wrapper.text(), /Chimio/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientDetail: CARDIOLOGIE affiche specialty', async (t) => {
  const { wrapper, stub } = await mountDetail(
    ['patients:read', 'service:cardiologie'],
    basePatient({
      service: 'CARDIOLOGIE',
      medicalRecord: { id: 'mr1', service: 'CARDIOLOGIE' },
      specialty: {
        ecg_results: 'Rythme sinusal',
        resting_heart_rate: 72,
        blood_pressure: '120/80',
      },
    })
  );
  try {
    const dossierTab = wrapper.findAll('button').find((b) => /Dossier médical/.test(b.text()));
    await dossierTab!.trigger('click');
    await flushPromises();
    t.match(wrapper.text(), /Rythme sinusal/);
    t.match(wrapper.text(), /72/);
    t.match(wrapper.text(), /120\/80/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientDetail: sans patients:update → pas Modifier', async (t) => {
  const { wrapper, stub } = await mountDetail(
    ['patients:read', 'service:urgence'],
    basePatient()
  );
  try {
    t.equal(wrapper.text().includes('Modifier'), false);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientDetail: patients:update → Modifier + navigation edit', async (t) => {
  const { wrapper, router, stub } = await mountDetail(
    ['patients:read', 'patients:update', 'service:urgence'],
    basePatient()
  );
  try {
    t.match(wrapper.text(), /Modifier/);
    const editBtn = wrapper.findAll('button').find((b) => b.text().trim() === 'Modifier');
    t.ok(editBtn);
    await editBtn!.trigger('click');
    await flushPromises();
    t.equal(router.currentRoute.value.name, 'patient-edit');
    t.equal(router.currentRoute.value.params.id, 'p1');
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientDetail: patients:delete → Supprimer + confirm', async (t) => {
  const { wrapper, stub } = await mountDetail(
    ['patients:read', 'patients:delete', 'service:urgence'],
    basePatient()
  );
  const delStub = sinon.stub(api, 'delete').resolves({ data: { ok: true } } as any);
  try {
    t.match(wrapper.text(), /Supprimer/);
    const delBtn = wrapper.findAll('button').find((b) => b.text().trim() === 'Supprimer');
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
    stub.restore();
    delStub.restore();
    t.end();
  }
});

test('intégration PatientDetail: sans patients:delete → pas Supprimer', async (t) => {
  const { wrapper, stub } = await mountDetail(
    ['patients:read', 'service:urgence'],
    basePatient()
  );
  try {
    t.equal(wrapper.text().includes('Supprimer'), false);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientDetail: 404 → ErrorState', async (t) => {
  const { wrapper, stub } = await mountDetail(['patients:read', 'service:urgence'], null, {
    rejectStatus: 404,
  });
  try {
    t.match(wrapper.text(), /introuvable/i);
    t.match(wrapper.text(), /Réessayer/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientDetail: 403 → message autorisation', async (t) => {
  const { wrapper, stub } = await mountDetail(['patients:read', 'service:urgence'], null, {
    rejectStatus: 403,
  });
  try {
    t.match(wrapper.text(), /autorisation|Accès refusé/i);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

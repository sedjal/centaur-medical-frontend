/**
 * INTÉGRATION FE — HistoryView + PatientDetail historique médical
 */
import '../setup-dom';
import test from 'tape';
import sinon from 'sinon';
import { h } from 'vue';
import api from '../../src/services/api';
import HistoryView from '../../src/views/HistoryView';
import PatientDetailView from '../../src/views/PatientDetailView';
import { mountView, flushPromises, sessionUser } from './mount';

const sampleEvent = {
  id: 'mh1',
  patientId: 'p1',
  eventType: 'PRESCRIPTION',
  occurredAt: '2026-08-12T14:30:00.000Z',
  service: 'URGENCE',
  doctorId: 'u-urg',
  doctorName: 'Léa Urg',
  summary: 'Nouvelle ordonnance créée',
  metadata: { prescriptionId: 'rx1', action: 'CREATED' },
};

const sampleList = { items: [sampleEvent], total: 1 };

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

function historyRoutes() {
  return [
    {
      path: '/login',
      name: 'login',
      component: { setup: () => () => h('div', 'login') },
      meta: { public: true },
    },
    { path: '/dashboard', name: 'dashboard', component: { setup: () => () => h('div', 'dash') } },
    {
      path: '/history',
      name: 'history',
      component: HistoryView,
      meta: { permission: 'medical_history:read' },
    },
    {
      path: '/patients/:id',
      name: 'patient-detail',
      component: PatientDetailView,
      meta: { permission: 'patients:read' },
    },
  ];
}

function stubGets(historyData: unknown, patientData: unknown = samplePatient) {
  return sinon.stub(api, 'get').callsFake((url: string) => {
    const path = String(url);
    if (path.includes('/medical-history')) {
      return Promise.resolve({ data: historyData } as any);
    }
    if (path.includes('/prescriptions')) {
      return Promise.resolve({ data: [] } as any);
    }
    return Promise.resolve({ data: patientData } as any);
  });
}

test('intégration HistoryView: liste (medical_history:read)', async (t) => {
  const stub = stubGets(sampleList);
  try {
    const { wrapper } = await mountView(HistoryView, {
      path: '/history',
      authenticated: true,
      user: sessionUser({
        permissions: ['medical_history:read', 'service:urgence'] as never,
      }),
      routes: historyRoutes(),
    });
    await flushPromises();
    t.ok(stub.calledWith('/medical-history'));
    t.match(wrapper.text(), /Nouvelle ordonnance créée|Léa Urg|Prescription/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration HistoryView: empty state', async (t) => {
  const stub = stubGets({ items: [], total: 0 });
  try {
    const { wrapper } = await mountView(HistoryView, {
      path: '/history',
      authenticated: true,
      user: sessionUser({
        permissions: ['medical_history:read', 'service:urgence'] as never,
      }),
      routes: historyRoutes(),
    });
    await flushPromises();
    t.match(wrapper.text(), /Aucun événement/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration HistoryView: sans medical_history:read → pas d’appel API', async (t) => {
  const stub = stubGets(sampleList);
  try {
    const { wrapper } = await mountView(HistoryView, {
      path: '/history',
      authenticated: true,
      user: sessionUser({
        permissions: ['patients:read', 'service:urgence'] as never,
      }),
      routes: historyRoutes(),
    });
    await flushPromises();
    t.equal(
      stub.getCalls().some((c) => String(c.args[0]).includes('/medical-history')),
      false
    );
    t.match(wrapper.text(), /autorisation de consulter l'historique/i);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientDetail: historique dans dossier (medical_history:read)', async (t) => {
  const stub = stubGets(sampleList, samplePatient);
  try {
    const { wrapper } = await mountView(PatientDetailView, {
      path: '/patients/p1',
      authenticated: true,
      user: sessionUser({
        permissions: [
          'patients:read',
          'medical_history:read',
          'service:urgence',
        ] as never,
      }),
      routes: historyRoutes(),
    });
    await flushPromises();
    const dossierTab = wrapper.findAll('button').find((b) => /Dossier médical/.test(b.text()));
    await dossierTab!.trigger('click');
    await flushPromises();
    t.ok(stub.calledWith('/patients/p1/medical-history'));
    t.match(wrapper.text(), /Historique médical/);
    t.match(wrapper.text(), /Nouvelle ordonnance créée/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration PatientDetail: sans medical_history:read → pas d’appel history', async (t) => {
  const stub = stubGets(sampleList, samplePatient);
  try {
    const { wrapper } = await mountView(PatientDetailView, {
      path: '/patients/p1',
      authenticated: true,
      user: sessionUser({
        permissions: ['patients:read', 'service:urgence'] as never,
      }),
      routes: historyRoutes(),
    });
    await flushPromises();
    const dossierTab = wrapper.findAll('button').find((b) => /Dossier médical/.test(b.text()));
    await dossierTab!.trigger('click');
    await flushPromises();
    t.equal(stub.calledWith('/patients/p1/medical-history'), false);
    t.match(wrapper.text(), /autorisation de consulter l'historique/i);
    t.equal(wrapper.text().includes('Nouvelle ordonnance créée'), false);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

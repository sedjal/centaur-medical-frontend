/**
 * INTÉGRATION FE — DashboardView
 */
import '../setup-dom';
import test from 'tape';
import sinon from 'sinon';
import { h } from 'vue';
import api from '../../src/services/api';
import DashboardView from '../../src/views/DashboardView';
import { mountView, flushPromises, sessionUser } from './mount';

function sampleStats(overrides: Record<string, unknown> = {}) {
  return {
    total: 24,
    critical: 3,
    admittedToday: 5,
    availableBeds: 12,
    totalBeds: 40,
    byService: {
      GENERAL: 8,
      URGENCE: 6,
      ONCOLOGIE: 5,
      CARDIOLOGIE: 5,
    },
    occupancy: [
      {
        service: 'GENERAL',
        label: 'Chirurgie générale',
        occupied: 8,
        capacity: 10,
        available: 2,
        percent: 80,
        load: 'Forte charge',
      },
      {
        service: 'URGENCE',
        label: 'Urgences',
        occupied: 6,
        capacity: 10,
        available: 4,
        percent: 60,
        load: 'Disponible',
      },
    ],
    recent: [
      {
        id: 'p1',
        patient_code: 'PT-000001',
        first_name: 'Ahmed',
        last_name: 'Benali',
        hospitalization_date: '2026-08-11',
        service: 'URGENCE',
        status: 'CRITICAL',
      },
    ],
    ...overrides,
  };
}

function dashRoutes() {
  return [
    {
      path: '/login',
      name: 'login',
      component: { setup: () => () => h('div', 'login') },
      meta: { public: true },
    },
    { path: '/dashboard', name: 'dashboard', component: DashboardView },
    {
      path: '/patients/:id',
      name: 'patient-detail',
      component: { setup: () => () => h('div', { 'data-page': 'detail' }, 'detail') },
      meta: { permission: 'patients:read' },
    },
  ];
}

async function mountDash(
  permissions: string[],
  stats: Record<string, unknown> | null,
  options?: { rejectStatus?: number; delay?: boolean }
) {
  let stub: sinon.SinonStub;
  if (options?.rejectStatus) {
    stub = sinon.stub(api, 'get').rejects({
      response: { status: options.rejectStatus, data: { error: 'err' } },
    });
  } else if (options?.delay) {
    stub = sinon.stub(api, 'get').returns(new Promise(() => undefined) as any);
  } else {
    stub = sinon.stub(api, 'get').resolves({ data: stats } as any);
  }

  const mounted = await mountView(DashboardView, {
    path: '/dashboard',
    authenticated: true,
    user: sessionUser({ permissions: permissions as never }),
    routes: dashRoutes(),
  });
  await flushPromises();
  return { ...mounted, stub };
}

test('intégration Dashboard: affiche 4 KPI', async (t) => {
  const { wrapper, stub } = await mountDash(
    ['patients:read', 'service:general', 'service:urgence'],
    sampleStats()
  );
  try {
    t.ok(stub.calledWith('/dashboard/stats'));
    const text = wrapper.text();
    t.match(text, /Patients/);
    t.match(text, /24/);
    t.match(text, /Critiques/);
    t.match(text, /3/);
    t.match(text, /Admis aujourd'hui/);
    t.match(text, /5/);
    t.match(text, /Lits disponibles/);
    t.match(text, /12/);
    t.match(text, /12\s*\/\s*40/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration Dashboard: patients par service', async (t) => {
  const { wrapper, stub } = await mountDash(
    ['patients:read', 'service:general'],
    sampleStats()
  );
  try {
    t.match(wrapper.text(), /Patients par service/);
    t.match(wrapper.text(), /Chirurgie générale/);
    t.match(wrapper.text(), /Urgences/);
    t.match(wrapper.text(), /Oncologie/);
    t.match(wrapper.text(), /Cardiologie/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration Dashboard: occupation des lits', async (t) => {
  const { wrapper, stub } = await mountDash(
    ['patients:read', 'service:urgence'],
    sampleStats()
  );
  try {
    t.match(wrapper.text(), /Occupation des lits/);
    t.match(wrapper.text(), /80%/);
    t.match(wrapper.text(), /Forte charge|Disponible/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration Dashboard: patients récents + Voir (patients:read)', async (t) => {
  const { wrapper, router, stub } = await mountDash(
    ['patients:read', 'service:urgence'],
    sampleStats()
  );
  try {
    t.match(wrapper.text(), /Patients récents/);
    t.match(wrapper.text(), /Benali|BENALI/);
    t.match(wrapper.text(), /PT-000001/);
    t.match(wrapper.text(), /Voir/);
    t.equal(wrapper.text().includes('Modifier'), false);

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

test('intégration Dashboard: LoadingState pendant chargement', async (t) => {
  const { wrapper, stub } = await mountDash(
    ['patients:read', 'service:general'],
    null,
    { delay: true }
  );
  try {
    t.match(wrapper.text(), /Chargement du dashboard/i);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration Dashboard: ErrorState + Réessayer', async (t) => {
  const stub = sinon.stub(api, 'get');
  stub.onFirstCall().rejects({ response: { status: 500, data: { error: 'boom' } } });
  stub.onSecondCall().resolves({ data: sampleStats() } as any);

  const { wrapper } = await mountView(DashboardView, {
    path: '/dashboard',
    authenticated: true,
    user: sessionUser({
      permissions: ['patients:read', 'service:general'] as never,
    }),
    routes: dashRoutes(),
  });
  await flushPromises();

  try {
    t.match(wrapper.text(), /Impossible de charger le dashboard|erreur|serveur/i);
    const retry = wrapper.findAll('button').find((b) => /Réessayer/i.test(b.text()));
    t.ok(retry);
    await retry!.trigger('click');
    await flushPromises();
    t.match(wrapper.text(), /Patients/);
    t.match(wrapper.text(), /24/);
    t.ok(stub.calledTwice);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration Dashboard: EmptyState recent vide', async (t) => {
  const { wrapper, stub } = await mountDash(
    ['patients:read', 'service:general'],
    sampleStats({ recent: [] })
  );
  try {
    t.match(wrapper.text(), /Aucun patient récent/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration Dashboard: EmptyState occupancy vide', async (t) => {
  const { wrapper, stub } = await mountDash(
    ['patients:read', 'service:general'],
    sampleStats({ occupancy: [] })
  );
  try {
    t.match(wrapper.text(), /Aucune occupation/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration Dashboard: sans patients:update le Voir reste visible avec patients:read', async (t) => {
  const { wrapper, stub } = await mountDash(
    ['patients:read', 'service:urgence'],
    sampleStats()
  );
  try {
    t.match(wrapper.text(), /Voir/);
    t.equal(wrapper.text().includes('Modifier'), false);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

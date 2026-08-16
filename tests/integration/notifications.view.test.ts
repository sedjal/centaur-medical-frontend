/**
 * INTÉGRATION FE — NotificationsView + Topbar badge
 */
import '../setup-dom';
import test from 'tape';
import sinon from 'sinon';
import { h } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import api from '../../src/services/api';
import NotificationsView from '../../src/views/NotificationsView';
import Topbar from '../../src/components/layout/Topbar';
import { useAuthStore } from '../../src/stores/auth';
import { mountView, flushPromises, sessionUser } from './mount';

const sample = {
  id: 'n1',
  recipientId: 'u1',
  patientId: null,
  type: 'GENERAL',
  title: 'Réunion staff',
  message: 'Salle A à 10h',
  scheduledAt: '2026-08-12T14:30:00.000Z',
  sentAt: '2026-08-12T14:30:00.000Z',
  readAt: null,
  status: 'SENT',
  createdBy: 'u2',
  createdAt: '2026-08-12T14:30:00.000Z',
  updatedAt: '2026-08-12T14:30:00.000Z',
};

const pending = {
  ...sample,
  id: 'n2',
  title: 'Rappel futur',
  status: 'PENDING',
  sentAt: null,
  scheduledAt: '2099-01-01T10:00:00.000Z',
};

function notifRoutes() {
  return [
    {
      path: '/login',
      name: 'login',
      component: { setup: () => () => h('div', 'login') },
      meta: { public: true },
    },
    { path: '/dashboard', name: 'dashboard', component: { setup: () => () => h('div', 'dash') } },
    {
      path: '/notifications',
      name: 'notifications',
      component: NotificationsView,
      meta: { permission: 'notifications:read' },
    },
  ];
}

function stubGets(list: unknown) {
  return sinon.stub(api, 'get').callsFake((url: string) => {
    const path = String(url);
    if (path.includes('/notifications')) {
      return Promise.resolve({ data: list } as any);
    }
    if (path.includes('/patients')) {
      return Promise.resolve({ data: [] } as any);
    }
    if (path.includes('/users/directory')) {
      return Promise.resolve({
        data: [
          {
            id: 'u1',
            email: 'doctor@test.com',
            first_name: 'Racha',
            last_name: 'M',
            role: 'MEDECIN',
          },
          {
            id: 'u2',
            email: 'sec@test.com',
            first_name: 'Sam',
            last_name: 'Sec',
            role: 'SECRETAIRE',
          },
        ],
      } as any);
    }
    if (path.includes('/users')) {
      return Promise.resolve({ data: [] } as any);
    }
    return Promise.resolve({ data: {} } as any);
  });
}

test('intégration NotificationsView: liste (notifications:read)', async (t) => {
  const stub = stubGets({ items: [sample], total: 1 });
  try {
    const { wrapper } = await mountView(NotificationsView, {
      path: '/notifications',
      authenticated: true,
      user: sessionUser({
        id: 'u1',
        permissions: ['notifications:read', 'service:urgence'] as never,
      }),
      routes: notifRoutes(),
    });
    await flushPromises();
    t.ok(stub.calledWith('/notifications'));
    t.match(wrapper.text(), /Réunion staff|Salle A/);
    t.match(wrapper.text(), /Toutes/);
    t.match(wrapper.text(), /Non lues/);
    t.equal(wrapper.text().includes('Nouvelle notification'), false);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration NotificationsView: empty + create button', async (t) => {
  const stub = stubGets({ items: [], total: 0 });
  try {
    const { wrapper } = await mountView(NotificationsView, {
      path: '/notifications',
      authenticated: true,
      user: sessionUser({
        id: 'u1',
        permissions: [
          'notifications:read',
          'notifications:create',
          'service:urgence',
        ] as never,
      }),
      routes: notifRoutes(),
    });
    await flushPromises();
    t.match(wrapper.text(), /Aucune notification/);
    t.match(wrapper.text(), /Nouvelle notification/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration NotificationsView: sans permission → pas d’appel', async (t) => {
  const stub = stubGets({ items: [sample], total: 1 });
  try {
    const { wrapper } = await mountView(NotificationsView, {
      path: '/notifications',
      authenticated: true,
      user: sessionUser({
        permissions: ['patients:read', 'service:urgence'] as never,
      }),
      routes: notifRoutes(),
    });
    await flushPromises();
    t.equal(
      stub.getCalls().some((c) => String(c.args[0]).includes('/notifications')),
      false
    );
    t.match(wrapper.text(), /autorisation de consulter les notifications/i);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration NotificationsView: PENDING affiche Planifiée + Annuler', async (t) => {
  const stub = stubGets({ items: [pending], total: 1 });
  try {
    const { wrapper } = await mountView(NotificationsView, {
      path: '/notifications',
      authenticated: true,
      user: sessionUser({
        id: 'u1',
        permissions: [
          'notifications:read',
          'notifications:cancel',
          'service:urgence',
        ] as never,
      }),
      routes: notifRoutes(),
    });
    await flushPromises();
    t.match(wrapper.text(), /Planifiée/);
    t.match(wrapper.text(), /Annuler/);
    t.match(wrapper.text(), /Rappel futur/);
    t.equal(wrapper.text().includes('Marquer comme lue'), false);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration NotificationsView: clic ouvre détail destinataire + auteur', async (t) => {
  const stub = stubGets({ items: [sample], total: 1 });
  try {
    const { wrapper } = await mountView(NotificationsView, {
      path: '/notifications',
      authenticated: true,
      user: sessionUser({
        id: 'u1',
        permissions: ['notifications:read', 'notifications:create', 'service:urgence'] as never,
      }),
      routes: notifRoutes(),
    });
    await flushPromises();
    await wrapper.find('.notif-item').trigger('click');
    await flushPromises();
    t.match(wrapper.text(), /Détail de la notification/);
    t.match(wrapper.text(), /Destinataire/);
    t.match(wrapper.text(), /Vous/);
    t.match(wrapper.text(), /Créée par/);
    t.match(wrapper.text(), /SEC Sam/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration NotificationsView: filtres Toutes / Non lues / Lues', async (t) => {
  const stub = stubGets({ items: [sample], total: 1 });
  try {
    const { wrapper } = await mountView(NotificationsView, {
      path: '/notifications',
      authenticated: true,
      user: sessionUser({
        id: 'u1',
        permissions: ['notifications:read', 'service:urgence'] as never,
      }),
      routes: notifRoutes(),
    });
    await flushPromises();
    const unread = wrapper.findAll('button').find((b) => /Non lues/.test(b.text()));
    const read = wrapper.findAll('button').find((b) => b.text() === 'Lues');
    t.ok(unread);
    t.ok(read);
    await unread!.trigger('click');
    await flushPromises();
    t.ok(
      stub.getCalls().some((c) => c.args[1]?.params?.read === 'false'),
      'filtre non lues'
    );
    await read!.trigger('click');
    await flushPromises();
    t.ok(
      stub.getCalls().some((c) => c.args[1]?.params?.read === 'true'),
      'filtre lues'
    );
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration NotificationsView: CANCELLED discrète', async (t) => {
  const stub = stubGets({
    items: [{ ...sample, id: 'n3', status: 'CANCELLED', title: 'Rappel annulé' }],
    total: 1,
  });
  try {
    const { wrapper } = await mountView(NotificationsView, {
      path: '/notifications',
      authenticated: true,
      user: sessionUser({
        id: 'u1',
        permissions: ['notifications:read', 'service:urgence'] as never,
      }),
      routes: notifRoutes(),
    });
    await flushPromises();
    t.match(wrapper.text(), /Rappel annulé/);
    t.match(wrapper.text(), /Annulée/);
    t.ok(wrapper.find('.notif-item--cancelled').exists());
    t.equal(wrapper.text().includes('Marquer comme lue'), false);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration NotificationsView: mark as read', async (t) => {
  const getStub = stubGets({ items: [sample], total: 1 });
  const patchStub = sinon
    .stub(api, 'patch')
    .resolves({ data: { ...sample, status: 'READ', readAt: '2026-08-12T15:00:00.000Z' } } as any);
  try {
    const { wrapper } = await mountView(NotificationsView, {
      path: '/notifications',
      authenticated: true,
      user: sessionUser({
        id: 'u1',
        permissions: ['notifications:read', 'service:urgence'] as never,
      }),
      routes: notifRoutes(),
    });
    await flushPromises();
    const btn = wrapper.findAll('button').find((b) => /Marquer comme lue/.test(b.text()));
    t.ok(btn);
    await btn!.trigger('click');
    await flushPromises();
    t.ok(patchStub.calledWith('/notifications/n1/read'));
    wrapper.unmount();
  } finally {
    getStub.restore();
    patchStub.restore();
    t.end();
  }
});

test('intégration Topbar: badge absent si 0, présent si unread > 0', async (t) => {
  const stub = sinon.stub(api, 'get').resolves({ data: { items: [sample], total: 1 } } as any);
  try {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          name: 'dashboard',
          component: { setup: () => () => h('div', 'dash') },
          meta: { title: 'Dashboard' },
        },
        ...notifRoutes(),
      ],
    });
    const auth = useAuthStore();
    auth.setSession(
      'access-jwt',
      sessionUser({
        id: 'u1',
        permissions: ['notifications:read', 'service:urgence'] as never,
      })
    );
    await router.push('/');
    await router.isReady();

    const w = mount(Topbar, {
      props: { onMenuToggle: () => undefined },
      global: { plugins: [pinia, router] },
    });
    await flushPromises();
    t.equal(w.find('.notif-badge').exists(), true);
    t.match(w.find('.notif-badge').text(), /1/);
    w.unmount();

    stub.resolves({ data: { items: [], total: 0 } } as any);
    const w2 = mount(Topbar, {
      props: { onMenuToggle: () => undefined },
      global: { plugins: [pinia, router] },
    });
    await flushPromises();
    t.equal(w2.find('.notif-badge').exists(), false);
    w2.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration Topbar: dropdown notifications', async (t) => {
  const stub = sinon.stub(api, 'get').resolves({ data: { items: [sample], total: 1 } } as any);
  try {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          name: 'dashboard',
          component: { setup: () => () => h('div', 'dash') },
          meta: { title: 'Dashboard' },
        },
        ...notifRoutes(),
      ],
    });
    const auth = useAuthStore();
    auth.setSession(
      'access-jwt',
      sessionUser({
        id: 'u1',
        permissions: ['notifications:read', 'service:urgence'] as never,
      })
    );
    await router.push('/');
    await router.isReady();
    const w = mount(Topbar, {
      props: { onMenuToggle: () => undefined },
      global: { plugins: [pinia, router] },
    });
    await flushPromises();
    t.equal(w.find('.notif-dropdown').exists(), false);
    await w.find('.notif-badge-btn').trigger('click');
    await flushPromises();
    t.ok(w.find('.notif-dropdown').exists());
    t.match(w.text(), /Réunion staff/);
    t.match(w.text(), /Voir toutes/);
    w.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration NotificationsView: formulaire destinataire (sans users:read)', async (t) => {
  const stub = stubGets({ items: [], total: 0 });
  try {
    const { wrapper } = await mountView(NotificationsView, {
      path: '/notifications',
      authenticated: true,
      user: sessionUser({
        id: 'u-dir',
        firstName: 'Lydia',
        lastName: 'Sedjal',
        role: 'DIRECTION',
        permissions: [
          'notifications:read',
          'notifications:create',
          'notifications:read_all',
          'patients:read',
          'service:general',
        ] as never,
      }),
      routes: notifRoutes(),
    });
    await flushPromises();
    t.ok(
      stub.getCalls().some((c) => String(c.args[0]).includes('/users/directory')),
      'charge l’annuaire via notifications:create'
    );
    t.equal(
      stub.getCalls().some((c) => String(c.args[0]) === '/users'),
      false
    );
    const createBtn = wrapper.findAll('button').find((b) => /Nouvelle notification/.test(b.text()));
    t.ok(createBtn);
    await createBtn!.trigger('click');
    await flushPromises();
    t.match(wrapper.text(), /Destinataire/);
    const recipientInput = wrapper.find('.cm-combobox__input');
    t.ok(recipientInput.exists());
    await recipientInput.trigger('focus');
    await flushPromises();
    t.match(wrapper.text(), /SEC Sam|Rechercher par nom/);
    await recipientInput.setValue('sam');
    await flushPromises();
    t.match(wrapper.text(), /SEC Sam/);
    t.equal(wrapper.text().includes('Identifiant utilisateur destinataire'), false);
    t.equal(wrapper.html().includes('b0000001'), false);
    t.match(wrapper.text(), /Maintenant/);
    t.match(wrapper.text(), /Programmer/);
    t.equal(wrapper.find('input[type="datetime-local"]').exists(), false);
    const later = wrapper.findAll('input[type="radio"]').find((r) => {
      const el = r.element as HTMLInputElement;
      return el.nextSibling && String(el.parentElement?.textContent || '').includes('Programmer');
    });
    t.ok(later);
    await later!.setValue(true);
    await later!.trigger('change');
    await flushPromises();
    t.ok(wrapper.find('input[type="datetime-local"]').exists());
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

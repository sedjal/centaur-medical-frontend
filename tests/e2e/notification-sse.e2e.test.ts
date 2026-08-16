/**
 * E2E FE — SSE notifications : badge, dropdown, logout, reconnexion (JWT hors URL).
 */
import '../setup-dom';
import test from 'tape';
import { h } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import api from '../../src/services/api';
import Topbar from '../../src/components/layout/Topbar';
import { useAuthStore } from '../../src/stores/auth';
import {
  teardownNotificationStream,
  useNotifications,
  __resetNotificationStreamForTests,
} from '../../src/composables/useNotifications';
import { __disableNativeNotificationStream } from '../../src/api/notifications.stream';
import { createFakeNotificationStream } from '../helpers/fake-notification-stream';
import { sessionUser, flushPromises } from '../integration/mount';

const streams = createFakeNotificationStream();

const rxNotif = {
  id: 'n-rx',
  recipientId: 'u-med-b',
  patientId: 'p-urg-1',
  type: 'PRESCRIPTION',
  title: 'Nouvelle ordonnance créée',
  message: 'Une nouvelle ordonnance a été créée pour BENALI Ahmed (PT-000124).',
  scheduledAt: '2026-08-16T09:00:00.000Z',
  sentAt: '2026-08-16T09:00:00.000Z',
  readAt: null,
  status: 'SENT',
  createdBy: 'u-med-a',
  createdAt: '2026-08-16T09:00:00.000Z',
  updatedAt: '2026-08-16T09:00:00.000Z',
};

function okAdapter(payload: unknown) {
  return (async (config: { url?: string }) => ({
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    data: payload,
  })) as typeof api.defaults.adapter;
}

async function mountDashboardTopbar() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: { setup: () => () => h('div', 'dash') } },
      {
        path: '/login',
        name: 'login',
        component: { setup: () => () => h('div', 'login') },
        meta: { public: true },
      },
      { path: '/notifications', name: 'notifications', component: { setup: () => () => h('div', 'n') } },
    ],
  });
  const auth = useAuthStore();
  auth.setSession(
    'access-jwt',
    sessionUser({
      id: 'u-med-b',
      permissions: ['notifications:read', 'service:urgence'] as never,
    })
  );
  await router.push('/');
  await router.isReady();
  const wrapper = mount(Topbar, {
    props: { onMenuToggle: () => undefined },
    global: { plugins: [pinia, router] },
  });
  await flushPromises();
  return { wrapper, router, auth };
}

test('e2e FE: REST fonctionne si stream SSE indisponible (pas de crash)', async (t) => {
  __resetNotificationStreamForTests();
  __disableNativeNotificationStream();
  const original = api.defaults.adapter;
  api.defaults.adapter = okAdapter({ items: [], total: 0 });
  localStorage.setItem('centaur_token', 'access-jwt');
  const { unreadCount, fetchUnreadCount, connectionState, connect } = useNotifications();
  connect();
  t.equal(connectionState.value, 'disconnected');
  await fetchUnreadCount();
  t.equal(unreadCount.value, 0);
  teardownNotificationStream();
  api.defaults.adapter = original;
  t.end();
});

test('e2e FE: Topbar 🔔 +1 via SSE sans fermer le dropdown ; pas de token dans l’URL', async (t) => {
  __resetNotificationStreamForTests();
  streams.install();
  const original = api.defaults.adapter;
  let list = { items: [] as unknown[], total: 0 };
  api.defaults.adapter = (async () => ({
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
    data: list,
  })) as typeof api.defaults.adapter;

  try {
    const { wrapper } = await mountDashboardTopbar();
    await flushPromises();
    t.equal(wrapper.find('.notif-badge').exists(), false);
    t.equal(streams.instances.length, 1);
    t.match(streams.instances[0].url, /\/notifications\/stream$/);
    t.equal(streams.instances[0].url.includes('access_token'), false);
    t.equal(streams.instances[0].token, 'access-jwt');

    await wrapper.find('.notif-badge-btn').trigger('click');
    await flushPromises();
    t.ok(wrapper.find('.notif-dropdown').exists());

    list = { items: [rxNotif], total: 1 };
    streams.instances[0].emitCreated({
      notificationId: 'n-rx',
      type: 'PRESCRIPTION',
      unreadCount: 1,
    });
    await flushPromises();
    t.ok(wrapper.find('.notif-dropdown').exists(), 'dropdown reste ouvert');
    t.match(wrapper.find('.notif-badge').text(), /1/);
    t.match(wrapper.text(), /Nouvelle ordonnance créée/);
    wrapper.unmount();
  } finally {
    __disableNativeNotificationStream();
    api.defaults.adapter = original;
    __resetNotificationStreamForTests();
    t.end();
  }
});

test('e2e FE: logout ferme le stream SSE', async (t) => {
  __resetNotificationStreamForTests();
  streams.install();
  const original = api.defaults.adapter;
  api.defaults.adapter = okAdapter({ items: [], total: 0 });
  try {
    const { wrapper } = await mountDashboardTopbar();
    await flushPromises();
    t.equal(streams.instances[0].closed, false);
    await wrapper.find('.topbar-logout-btn').trigger('click');
    await flushPromises();
    t.equal(streams.instances[0].closed, true);
  } finally {
    __disableNativeNotificationStream();
    api.defaults.adapter = original;
    __resetNotificationStreamForTests();
    t.end();
  }
});

test('e2e FE: reconnexion SSE resynchronise GET /notifications', async (t) => {
  __resetNotificationStreamForTests();
  streams.install();
  const original = api.defaults.adapter;
  let calls = 0;
  api.defaults.adapter = (async (config: { url?: string }) => {
    if (String(config.url || '').includes('/notifications')) calls += 1;
    return {
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      data: { items: [], total: calls },
    };
  }) as typeof api.defaults.adapter;
  localStorage.setItem('centaur_token', 'access-jwt');
  const { connectionState, unreadCount, connect } = useNotifications();
  connect();
  await new Promise((r) => setTimeout(r, 15));
  t.equal(connectionState.value, 'connected');
  const afterOpen = calls;
  t.equal(afterOpen, 0);
  streams.instances[0].fail();
  t.equal(connectionState.value, 'disconnected');
  streams.instances[0].reopen();
  await new Promise((r) => setTimeout(r, 15));
  t.equal(connectionState.value, 'connected');
  t.ok(calls > afterOpen, 'GET après reconnexion');
  t.equal(unreadCount.value, calls);
  teardownNotificationStream();
  __disableNativeNotificationStream();
  api.defaults.adapter = original;
  __resetNotificationStreamForTests();
  t.end();
});

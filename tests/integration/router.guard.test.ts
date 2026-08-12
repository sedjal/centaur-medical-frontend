/**
 * INTÉGRATION FE — garde de navigation (public / ACCESS / RBAC)
 */
import '../setup-dom';
import test from 'tape';
import { h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory } from 'vue-router';
import { createAppRouter } from '../../src/router';
import { useAuthStore } from '../../src/stores/auth';
import api from '../../src/services/api';
import sinon from 'sinon';
import { sessionUser } from './mount';

async function boot(authenticated = false, permissions: string[] = ['patients:read']) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createAppRouter(createMemoryHistory());
  const auth = useAuthStore();
  if (authenticated) {
    auth.setSession(
      'access-jwt',
      sessionUser({
        permissions: permissions as never,
        role: permissions.includes('users:read') ? 'ADMIN' : 'MEDECIN',
      })
    );
  }
  const wrapper = mount(
    { name: 'Root', setup: () => () => h('div', { id: 'app-root' }, 'root') },
    { global: { plugins: [pinia, router] } }
  );
  await router.isReady();
  return { wrapper, router, auth };
}

test('intégration router: visiteur → /patients redirige vers login', async (t) => {
  localStorage.clear();
  try {
    const { wrapper, router } = await boot(false);
    await router.push('/patients');
    await flushPromises();
    t.equal(router.currentRoute.value.name, 'login');
    wrapper.unmount();
  } finally {
    t.end();
  }
});

test('intégration router: session ACCESS → /login redirige vers dashboard', async (t) => {
  localStorage.clear();
  const me = sinon.stub(api, 'get').resolves({
    data: {
      id: 'u1',
      email: 'doctor@test.com',
      role: 'MEDECIN',
      permissions: ['patients:read'],
      first_name: 'Racha',
      last_name: 'M',
    },
  } as any);
  try {
    const { wrapper, router } = await boot(true);
    await router.push('/login');
    await flushPromises();
    t.equal(router.currentRoute.value.name, 'dashboard');
    wrapper.unmount();
  } finally {
    me.restore();
    t.end();
  }
});

test('intégration router: sans patients:create → /patients/new redirige dashboard', async (t) => {
  localStorage.clear();
  try {
    const { wrapper, router } = await boot(true, ['patients:read']);
    await router.push('/patients/new');
    await flushPromises();
    t.equal(router.currentRoute.value.name, 'dashboard');
    wrapper.unmount();
  } finally {
    t.end();
  }
});

test('intégration router: users:read → /users autorisé', async (t) => {
  localStorage.clear();
  try {
    const { wrapper, router } = await boot(true, ['patients:read', 'users:read']);
    await router.push('/users');
    await flushPromises();
    t.equal(router.currentRoute.value.name, 'users');
    wrapper.unmount();
  } finally {
    t.end();
  }
});

test('intégration router: loadMe 401 → logout + login', async (t) => {
  localStorage.clear();
  const stub = sinon.stub(api, 'get').rejects({
    response: { status: 401, data: { error: 'Unauthorized' } },
  });
  try {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createAppRouter(createMemoryHistory());
    const auth = useAuthStore();
    auth.token = 'expired-jwt';
    localStorage.setItem('centaur_token', 'expired-jwt');

    const wrapper = mount(
      { name: 'Root', setup: () => () => h('div', 'root') },
      { global: { plugins: [pinia, router] } }
    );
    await router.isReady();
    await router.push('/dashboard');
    await flushPromises();

    t.equal(router.currentRoute.value.name, 'login');
    t.equal(auth.token, null);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

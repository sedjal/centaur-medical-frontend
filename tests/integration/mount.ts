/**
 * Mini-app Vue pour tests d'intégration (Pinia + router + vue-test-utils).
 */
import { h, type Component } from 'vue';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../../src/stores/auth';
import type { AuthUser, Permission } from '../../src/types';

export { flushPromises };

const stub = (label: string): Component => ({
  name: `${label}Stub`,
  setup: () => () => h('div', { 'data-page': label }, label),
});

export function sessionUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'u1',
    email: 'doctor@test.com',
    role: 'MEDECIN',
    permissions: ['patients:read'] as Permission[],
    firstName: 'Racha',
    lastName: 'M',
    ...overrides,
  };
}

export async function mountView(
  component: Component,
  options: {
    path?: string;
    routes?: RouteRecordRaw[];
    authenticated?: boolean;
    user?: AuthUser;
    props?: Record<string, unknown>;
  } = {}
): Promise<{ wrapper: VueWrapper; router: ReturnType<typeof createRouter>; auth: ReturnType<typeof useAuthStore> }> {
  const pinia = createPinia();
  setActivePinia(pinia);

  const routes: RouteRecordRaw[] = options.routes || [
    { path: '/login', name: 'login', component, meta: { public: true } },
    { path: '/mfa', name: 'mfa', component: stub('mfa'), meta: { public: true } },
    {
      path: '/change-password',
      name: 'change-password',
      component: stub('change-password'),
      meta: { public: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: stub('forgot-password'),
      meta: { public: true },
    },
    { path: '/dashboard', name: 'dashboard', component: stub('dashboard') },
    { path: '/patients', name: 'patients', component: stub('patients') },
    {
      path: '/patients/new',
      name: 'patient-create',
      component: stub('patient-create'),
      meta: { permission: 'patients:create' },
    },
    { path: '/users', name: 'users', component: stub('users'), meta: { permission: 'users:read' } },
  ];

  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  });

  router.beforeEach(async (to) => {
    const auth = useAuthStore();
    if (to.meta.public) {
      if (auth.isAuthenticated && to.name === 'login') return { name: 'dashboard' };
      return true;
    }
    if (!auth.isAuthenticated) return { name: 'login' };
    const perm = to.meta.permission as string | undefined;
    if (perm && !auth.hasPermission(perm as never)) {
      return { name: 'dashboard' };
    }
    return true;
  });

  const auth = useAuthStore();
  if (options.authenticated) {
    const user = options.user || sessionUser();
    auth.setSession('access-jwt', user);
  }

  await router.push(options.path || '/login');
  await router.isReady();

  const wrapper = mount(component, {
    global: { plugins: [pinia, router] },
    attachTo: document.body,
    props: options.props,
  });
  await flushPromises();

  return { wrapper, router, auth };
}

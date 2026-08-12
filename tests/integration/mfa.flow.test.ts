/**
 * INTÉGRATION FE — MfaView (code valide → dashboard)
 */
import '../setup-dom';
import test from 'tape';
import sinon from 'sinon';
import { h } from 'vue';
import api from '../../src/services/api';
import MfaView from '../../src/views/MfaView';
import { mountView, flushPromises } from './mount';

test('intégration MfaView: code valide → dashboard', async (t) => {
  localStorage.setItem('centaur_mfa_token', 'mfa-tok');
  const stub = sinon.stub(api, 'post').resolves({
    data: {
      token: 'access-jwt',
      user: {
        email: 'admin@test.com',
        role: 'ADMIN',
        permissions: ['patients:read'],
        firstName: 'K',
        lastName: 'S',
      },
    },
  } as any);

  try {
    const { wrapper, router, auth } = await mountView(MfaView, {
      path: '/mfa',
      routes: [
        { path: '/mfa', name: 'mfa', component: MfaView, meta: { public: true } },
        { path: '/dashboard', name: 'dashboard', component: { setup: () => () => h('div', 'dash') } },
        { path: '/login', name: 'login', component: { setup: () => () => h('div', 'login') }, meta: { public: true } },
      ],
    });
    auth.mfaToken = 'mfa-tok';

    await wrapper.find('input').setValue('123456');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    t.equal(auth.token, 'access-jwt');
    t.equal(router.currentRoute.value.name, 'dashboard');
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

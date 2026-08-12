/**
 * INTÉGRATION FE — LoginView (OK / MFA / CHANGE_PASSWORD / erreur 401)
 */
import '../setup-dom';
import test from 'tape';
import sinon from 'sinon';
import api from '../../src/services/api';
import LoginView from '../../src/views/LoginView';
import { mountView, flushPromises } from './mount';

async function fillLogin(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], email: string, password: string) {
  const inputs = wrapper.findAll('input');
  await inputs[0].setValue(email);
  await inputs[1].setValue(password);
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}

test('intégration LoginView: OK → dashboard + JWT en localStorage', async (t) => {
  localStorage.clear();
  const stub = sinon.stub(api, 'post').resolves({
    data: {
      status: 'OK',
      token: 'access-jwt',
      user: {
        email: 'doctor@test.com',
        role: 'MEDECIN',
        permissions: ['patients:read'],
        firstName: 'Racha',
        lastName: 'M',
      },
    },
  } as any);

  try {
    const { wrapper, router, auth } = await mountView(LoginView);
    await fillLogin(wrapper, 'doctor@test.com', 'Admin123!');

    t.equal(auth.token, 'access-jwt');
    t.equal(localStorage.getItem('centaur_token'), 'access-jwt');
    t.equal(router.currentRoute.value.name, 'dashboard');
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration LoginView: REQUIRES_MFA → /mfa', async (t) => {
  localStorage.clear();
  const stub = sinon.stub(api, 'post').resolves({
    data: { status: 'REQUIRES_MFA', mfaToken: 'mfa-tok', email: 'admin@test.com' },
  } as any);

  try {
    const { wrapper, router, auth } = await mountView(LoginView);
    await fillLogin(wrapper, 'admin@test.com', 'Admin123!');

    t.equal(auth.mfaToken, 'mfa-tok');
    t.equal(localStorage.getItem('centaur_mfa_token'), 'mfa-tok');
    t.equal(router.currentRoute.value.name, 'mfa');
    t.equal(auth.token, null);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration LoginView: CHANGE_PASSWORD → /change-password', async (t) => {
  localStorage.clear();
  const stub = sinon.stub(api, 'post').resolves({
    data: { status: 'CHANGE_PASSWORD', tempToken: 'tmp-tok' },
  } as any);

  try {
    const { wrapper, router, auth } = await mountView(LoginView);
    await fillLogin(wrapper, 'new@test.com', 'TempPass1!');

    t.equal(auth.tempToken, 'tmp-tok');
    t.equal(router.currentRoute.value.name, 'change-password');
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration LoginView: mauvais mot de passe → alerte, reste sur login', async (t) => {
  localStorage.clear();
  const stub = sinon.stub(api, 'post').rejects({
    response: { status: 401, data: { error: 'Invalid credentials' } },
  });

  try {
    const { wrapper, router } = await mountView(LoginView);
    await fillLogin(wrapper, 'doctor@test.com', 'Wrong');

    t.equal(router.currentRoute.value.name, 'login');
    t.match(wrapper.text(), /Invalid credentials|Échec de connexion/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

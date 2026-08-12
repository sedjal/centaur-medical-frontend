/**
 * UNIT FE — auth store (tape + sinon sur axios `api`)
 * On stubbe `api.post/get` (objet mutable), pas les exports ESM.
 */
import test from 'tape';
import sinon from 'sinon';
import { setActivePinia, createPinia } from 'pinia';
import api from '../../src/services/api';
import { useAuthStore } from '../../src/stores/auth';

test('auth store: login OK stocke le JWT', async (t) => {
  setActivePinia(createPinia());
  localStorage.clear();
  const stub = sinon.stub(api, 'post').resolves({
    data: {
      status: 'OK',
      token: 'jwt-token',
      user: {
        email: 'rachasl720@gmail.com',
        role: 'MEDECIN',
        permissions: ['patients:read'],
        firstName: 'Racha',
        lastName: 'M',
      },
    },
  } as any);

  const store = useAuthStore();
  const result = await store.login('rachasl720@gmail.com', 'Admin123!');
  t.equal(result.status, 'OK');
  t.equal(store.token, 'jwt-token');
  t.equal(localStorage.getItem('centaur_token'), 'jwt-token');
  stub.restore();
  t.end();
});

test('auth store: REQUIRES_MFA', async (t) => {
  setActivePinia(createPinia());
  localStorage.clear();
  const stub = sinon.stub(api, 'post').resolves({
    data: {
      status: 'REQUIRES_MFA',
      mfaToken: 'mfa-tok',
      email: 'sedjalkhouloud@gmail.com',
    },
  } as any);

  const store = useAuthStore();
  const result = await store.login('a@b.c', 'x');
  t.equal(result.status, 'REQUIRES_MFA');
  t.equal(store.mfaToken, 'mfa-tok');
  stub.restore();
  t.end();
});

test('auth store: CHANGE_PASSWORD', async (t) => {
  setActivePinia(createPinia());
  localStorage.clear();
  const stub = sinon.stub(api, 'post').resolves({
    data: { status: 'CHANGE_PASSWORD', tempToken: 'tmp-tok' },
  } as any);

  const store = useAuthStore();
  const result = await store.login('t@c.t', 'TempPass1!');
  t.equal(result.status, 'CHANGE_PASSWORD');
  t.equal(store.tempToken, 'tmp-tok');
  stub.restore();
  t.end();
});

test('auth store: logout nettoie le storage', (t) => {
  setActivePinia(createPinia());
  const store = useAuthStore();
  store.setSession('t', {
    email: 'a@b.c',
    role: 'ADMIN',
    permissions: [],
    firstName: 'A',
    lastName: 'B',
  });
  store.logout();
  t.equal(store.token, null);
  t.equal(localStorage.getItem('centaur_token'), null);
  t.end();
});

test('auth store: verifyMfa', async (t) => {
  setActivePinia(createPinia());
  localStorage.setItem('centaur_mfa_token', 'mfa');
  const stub = sinon.stub(api, 'post').resolves({
    data: {
      token: 'final-jwt',
      user: {
        email: 'sedjalkhouloud@gmail.com',
        role: 'ADMIN',
        permissions: ['patients:delete'],
        firstName: 'K',
        lastName: 'S',
      },
    },
  } as any);

  const store = useAuthStore();
  store.mfaToken = 'mfa';
  await store.verifyMfa('123456');
  t.equal(store.token, 'final-jwt');
  t.equal(store.hasPermission('patients:delete'), true);
  stub.restore();
  t.end();
});

test('auth store: login 401 renseigne error', async (t) => {
  setActivePinia(createPinia());
  localStorage.clear();
  const stub = sinon.stub(api, 'post').rejects({
    response: { data: { error: 'Invalid credentials' } },
  });
  const store = useAuthStore();
  try {
    await store.login('a@b.c', 'wrong');
    t.fail('aurait dû throw');
  } catch {
    t.equal(store.error, 'Invalid credentials');
    t.equal(store.token, null);
  }
  stub.restore();
  t.end();
});

test('auth store: loadMe hydrate user ; sans token → null', async (t) => {
  localStorage.clear();
  setActivePinia(createPinia());
  const store = useAuthStore();
  t.equal(await store.loadMe(), null);

  store.token = 'jwt';
  const stub = sinon.stub(api, 'get').resolves({
    data: {
      id: 'u1',
      email: 'a@b.c',
      role: 'MEDECIN',
      permissions: ['patients:read'],
      first_name: 'Racha',
      last_name: 'M',
    },
  } as any);
  const me = await store.loadMe();
  t.equal(me?.email, 'a@b.c');
  t.equal(store.fullName, 'Racha M');
  t.equal(store.isAuthenticated, true);
  t.equal(store.hasPermission('patients:read'), true);
  t.equal(store.hasPermission('patients:delete'), false);
  stub.restore();
  t.end();
});

test('auth store: completeForcedPasswordChange OK', async (t) => {
  setActivePinia(createPinia());
  localStorage.setItem('centaur_temp_token', 'tmp');
  const stub = sinon.stub(api, 'post').resolves({
    data: {
      status: 'OK',
      token: 'access',
      user: { email: 't@c.t', role: 'SECRETAIRE', permissions: [], firstName: 'T', lastName: 'C' },
    },
  } as any);
  const store = useAuthStore();
  store.tempToken = 'tmp';
  const result = await store.completeForcedPasswordChange('Oldpass1', 'Newpass1');
  t.equal(result.status, 'OK');
  t.equal(store.token, 'access');
  t.equal(localStorage.getItem('centaur_temp_token'), null);
  stub.restore();
  t.end();
});

test('auth store: completeForcedPasswordChange → REQUIRES_MFA', async (t) => {
  setActivePinia(createPinia());
  localStorage.clear();
  const stub = sinon.stub(api, 'post').resolves({
    data: { status: 'REQUIRES_MFA', mfaToken: 'mfa2', email: 'admin@test.com' },
  } as any);
  const store = useAuthStore();
  store.tempToken = 'tmp';
  const result = await store.completeForcedPasswordChange('Oldpass1', 'Newpass1');
  t.equal(result.status, 'REQUIRES_MFA');
  t.equal(store.mfaToken, 'mfa2');
  t.equal(localStorage.getItem('centaur_mfa_token'), 'mfa2');
  stub.restore();
  t.end();
});

test('auth store: forgot / verifyResetCode / resetPassword', async (t) => {
  setActivePinia(createPinia());
  const stub = sinon.stub(api, 'post');
  stub.onCall(0).resolves({ data: { ok: true } } as any);
  stub.onCall(1).resolves({ data: { resetToken: 'rst' } } as any);
  stub.onCall(2).resolves({ data: { ok: true } } as any);
  const store = useAuthStore();
  await store.requestPasswordReset('a@b.c');
  const token = await store.verifyResetCode('a@b.c', '123456');
  t.equal(token, 'rst');
  await store.resetPassword('rst', 'Newpass1');
  t.equal(stub.callCount, 3);
  stub.restore();
  t.end();
});

test('auth store: verifyMfa sans session → throw', async (t) => {
  setActivePinia(createPinia());
  localStorage.clear();
  const store = useAuthStore();
  store.mfaToken = null;
  try {
    await store.verifyMfa('123456');
    t.fail('aurait dû throw');
  } catch (e) {
    t.match(String((e as Error).message), /MFA/);
  }
  t.end();
});

/**
 * UNIT FE — intercepteurs axios (Bearer + purge 401)
 */
import '../setup-dom';
import { setHash } from '../setup-dom';
import test from 'tape';
import { AxiosError } from 'axios';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import api from '../../src/services/api';
import { setUnauthorizedHandler, ApiError } from '../../src/api/client';

const originalAdapter = api.defaults.adapter;

function okAdapter(): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig) => ({
    data: { ok: true },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
}

function failAdapter(status: number): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig) => {
    const err = new AxiosError(`status ${status}`);
    err.config = config;
    err.response = {
      data: { error: 'Unauthorized' },
      status,
      statusText: 'Unauthorized',
      headers: {},
      config,
    };
    return Promise.reject(err);
  };
}

test('interceptor: injecte Bearer depuis localStorage', async (t) => {
  localStorage.clear();
  localStorage.setItem('centaur_token', 'access-jwt');
  api.defaults.adapter = okAdapter();
  const res = await api.get('/auth/me');
  t.equal(res.status, 200);
  const authHeader =
    typeof res.config.headers.get === 'function'
      ? res.config.headers.get('Authorization')
      : res.config.headers.Authorization;
  t.equal(authHeader, 'Bearer access-jwt');
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('interceptor: pas de Bearer si localStorage vide', async (t) => {
  localStorage.clear();
  api.defaults.adapter = okAdapter();
  const res = await api.get('/patients');
  const authHeader =
    typeof res.config.headers.get === 'function'
      ? res.config.headers.get('Authorization')
      : res.config.headers.Authorization;
  t.equal(authHeader, undefined);
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('interceptor: 401 hors page auth → purge tokens', async (t) => {
  localStorage.clear();
  localStorage.setItem('centaur_token', 'access-jwt');
  localStorage.setItem('centaur_mfa_token', 'mfa');
  localStorage.setItem('centaur_temp_token', 'tmp');
  setHash('/dashboard');
  api.defaults.adapter = failAdapter(401);
  try {
    await api.get('/patients');
    t.fail('aurait dû throw');
  } catch {
    t.equal(localStorage.getItem('centaur_token'), null);
    t.equal(localStorage.getItem('centaur_mfa_token'), null);
    t.equal(localStorage.getItem('centaur_temp_token'), null);
  }
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('interceptor: 401 sur /login → ne purge pas (MFA / reset en cours)', async (t) => {
  localStorage.clear();
  localStorage.setItem('centaur_mfa_token', 'mfa-keep');
  setHash('/login');
  api.defaults.adapter = failAdapter(401);
  try {
    await api.post('/auth/login', { email: 'a@b.c', password: 'x' });
    t.fail('aurait dû throw');
  } catch {
    t.equal(localStorage.getItem('centaur_mfa_token'), 'mfa-keep');
  }
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('interceptor: 401 sur /mfa → ne purge pas', async (t) => {
  localStorage.clear();
  localStorage.setItem('centaur_mfa_token', 'mfa-keep');
  setHash('/mfa');
  api.defaults.adapter = failAdapter(401);
  try {
    await api.post('/auth/mfa/verify', { mfaToken: 'mfa-keep', code: '000000' });
    t.fail('aurait dû throw');
  } catch {
    t.equal(localStorage.getItem('centaur_mfa_token'), 'mfa-keep');
  }
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('interceptor: 403 ne purge pas le token', async (t) => {
  localStorage.clear();
  localStorage.setItem('centaur_token', 'access-jwt');
  setHash('/patients');
  api.defaults.adapter = failAdapter(403);
  try {
    await api.get('/patients');
    t.fail('aurait dû throw');
  } catch {
    t.equal(localStorage.getItem('centaur_token'), 'access-jwt');
  }
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('interceptor: 401 appelle unauthorizedHandler (logout)', async (t) => {
  localStorage.clear();
  localStorage.setItem('centaur_token', 'access-jwt');
  setHash('/dashboard');
  let called = 0;
  setUnauthorizedHandler(() => {
    called += 1;
    localStorage.removeItem('centaur_token');
  });
  api.defaults.adapter = failAdapter(401);
  try {
    await api.get('/patients');
    t.fail('aurait dû throw');
  } catch {
    t.equal(called, 1);
    t.equal(localStorage.getItem('centaur_token'), null);
  }
  setUnauthorizedHandler(null);
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('interceptor: 401 rejette une ApiError (pas Axios brut)', async (t) => {
  localStorage.clear();
  localStorage.setItem('centaur_token', 'access-jwt');
  setHash('/dashboard');
  api.defaults.adapter = failAdapter(401);
  try {
    await api.get('/patients');
    t.fail('aurait dû throw');
  } catch (err) {
    t.ok(err instanceof ApiError);
    t.match((err as Error).message, /Session expirée|reconnecter/i);
  }
  api.defaults.adapter = originalAdapter;
  t.end();
});

test('interceptor: 401 sur /auth/logout ne relance pas le handler', async (t) => {
  localStorage.clear();
  localStorage.setItem('centaur_token', 'access-jwt');
  setHash('/dashboard');
  let called = 0;
  setUnauthorizedHandler(() => {
    called += 1;
  });
  api.defaults.adapter = failAdapter(401);
  try {
    await api.post('/auth/logout');
    t.fail('aurait dû throw');
  } catch {
    t.equal(called, 0);
    t.equal(localStorage.getItem('centaur_token'), 'access-jwt');
  }
  setUnauthorizedHandler(null);
  api.defaults.adapter = originalAdapter;
  t.end();
});
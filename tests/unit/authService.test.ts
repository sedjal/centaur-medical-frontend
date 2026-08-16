/**
 * UNIT FE — auth service (tape + sinon sur axios api)
 */
import test from 'tape';
import sinon from 'sinon';
import api from '../../src/services/api';
import * as auth from '../../src/services/auth';

test('auth.login POST /auth/login', async (t) => {
  const stub = sinon.stub(api, 'post').resolves({
    data: { status: 'OK', token: 't', user: {} },
  } as any);
  const data = await auth.login('a@b.c', 'x');
  t.equal(data.status, 'OK');
  t.ok(stub.calledWith('/auth/login', { email: 'a@b.c', password: 'x' }));
  stub.restore();
  t.end();
});

test('auth.verifyMfa + forgotPassword', async (t) => {
  const stub = sinon.stub(api, 'post');
  stub.onFirstCall().resolves({ data: { token: 'jwt', user: {} } } as any);
  stub.onSecondCall().resolves({ data: { ok: true } } as any);
  await auth.verifyMfa('mfa', '123456');
  await auth.forgotPassword('a@b.c');
  t.equal(stub.callCount, 2);
  stub.restore();
  t.end();
});

test('auth.fetchMe GET /auth/me', async (t) => {
  const stub = sinon.stub(api, 'get').resolves({ data: { id: '1', email: 'a@b.c' } } as any);
  await auth.fetchMe();
  t.ok(stub.calledWith('/auth/me'));
  stub.restore();
  t.end();
});

test('auth.changePassword / changePasswordRequired / verifyResetCode / resetPassword', async (t) => {
  const stub = sinon.stub(api, 'post');
  stub.onCall(0).resolves({ data: { ok: true } } as any);
  stub.onCall(1).resolves({ data: { status: 'OK', token: 'jwt', user: {} } } as any);
  stub.onCall(2).resolves({ data: { resetToken: 'rst' } } as any);
  stub.onCall(3).resolves({ data: { ok: true } } as any);

  await auth.changePassword('old', 'Newpass1');
  await auth.changePasswordRequired('tmp', 'old', 'Newpass1');
  await auth.verifyResetCode('a@b.c', '123456');
  await auth.resetPassword('rst', 'Newpass1');

  t.ok(stub.getCall(0).calledWith('/auth/password/change', { currentPassword: 'old', newPassword: 'Newpass1' }));
  t.ok(
    stub.getCall(1).calledWith('/auth/password/change-required', {
      tempToken: 'tmp',
      currentPassword: 'old',
      newPassword: 'Newpass1',
    })
  );
  t.ok(stub.getCall(2).calledWith('/auth/password/verify-reset-code', { email: 'a@b.c', code: '123456' }));
  t.ok(stub.getCall(3).calledWith('/auth/password/reset', { resetToken: 'rst', newPassword: 'Newpass1' }));
  stub.restore();
  t.end();
});

test('auth.refreshSession POST /auth/refresh', async (t) => {
  const stub = sinon.stub(api, 'post').resolves({
    data: { status: 'OK', token: 'next', user: { email: 'a@b.c' } },
  } as any);
  const data = await auth.refreshSession();
  t.equal(data.token, 'next');
  t.ok(stub.calledWith('/auth/refresh'));
  stub.restore();
  t.end();
});

test('auth.logout POST /auth/logout with Bearer explicite', async (t) => {
  const stub = sinon.stub(api, 'post').resolves({ data: { ok: true } } as any);
  await auth.logout('access-jwt');
  t.ok(stub.calledOnce);
  t.equal(stub.firstCall.args[0], '/auth/logout');
  t.equal((stub.firstCall.args[2] as { headers: { Authorization: string } }).headers.Authorization, 'Bearer access-jwt');
  stub.restore();
  t.end();
});

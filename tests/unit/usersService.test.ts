/**
 * UNIT FE — users service (tape + sinon)
 */
import test from 'tape';
import sinon from 'sinon';
import api from '../../src/services/api';
import * as users from '../../src/services/users';

test('users.listUsers / createUser / deleteUser', async (t) => {
  const getStub = sinon.stub(api, 'get').resolves({ data: [] } as any);
  const postStub = sinon.stub(api, 'post').resolves({ data: { id: '1' } } as any);
  const patchStub = sinon.stub(api, 'patch').resolves({ data: {} } as any);
  const delStub = sinon.stub(api, 'delete').resolves({ data: {} } as any);

  await users.listUsers();
  await users.createUser({
    email: 'a@b.c',
    password: 'x',
    firstName: 'A',
    lastName: 'B',
    role: 'MEDECIN',
  });
  await users.updateUser('1', { firstName: 'Z' });
  await users.deleteUser('1');

  t.ok(getStub.called);
  t.ok(postStub.called);
  t.ok(patchStub.called);
  t.ok(delStub.calledWith('/users/1'));

  getStub.restore();
  postStub.restore();
  patchStub.restore();
  delStub.restore();
  t.end();
});

test('users.listRoles / listPermissions / createRole / updateRolePermissions / deleteRole', async (t) => {
  const getStub = sinon.stub(api, 'get').resolves({ data: [] } as any);
  const postStub = sinon.stub(api, 'post').resolves({ data: { id: 'r1' } } as any);
  const putStub = sinon.stub(api, 'put').resolves({ data: { ok: true } } as any);
  const delStub = sinon.stub(api, 'delete').resolves({ data: { ok: true } } as any);

  await users.listRoles();
  await users.listPermissions();
  await users.createRole({ name: 'INFIRMIER', permissions: ['patients:read'] });
  await users.updateRolePermissions('r1', ['patients:read']);
  await users.deleteRole('r1');

  t.ok(getStub.calledWith('/roles'));
  t.ok(getStub.calledWith('/permissions'));
  t.ok(postStub.calledWith('/roles'));
  t.ok(putStub.calledWith('/roles/r1/permissions', { permissions: ['patients:read'] }));
  t.ok(delStub.calledWith('/roles/r1'));

  getStub.restore();
  postStub.restore();
  putStub.restore();
  delStub.restore();
  t.end();
});

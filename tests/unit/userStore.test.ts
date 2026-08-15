/**
 * UNIT FE — user store (tape + sinon sur axios `api`)
 */
import test from 'tape';
import sinon from 'sinon';
import { setActivePinia, createPinia } from 'pinia';
import api from '../../src/services/api';
import { useUserStore } from '../../src/stores/user';

test('user store: fetchUsers', async (t) => {
  setActivePinia(createPinia());
  const stub = sinon.stub(api, 'get').resolves({
    data: [{ id: '1', email: 'a@b.c' }],
  } as any);
  const store = useUserStore();
  await store.fetchUsers();
  t.equal(store.users.length, 1);
  t.equal(store.loading, false);
  stub.restore();
  t.end();
});

test('user store: fetchUsers erreur', async (t) => {
  setActivePinia(createPinia());
  const stub = sinon.stub(api, 'get').rejects({
    response: { data: { error: 'Forbidden' } },
  });
  const store = useUserStore();
  try {
    await store.fetchUsers();
    t.fail('aurait dû throw');
  } catch {
    t.equal(store.error, 'Forbidden');
  }
  stub.restore();
  t.end();
});

test('user store: fetchRoles + createUser relance fetchUsers', async (t) => {
  setActivePinia(createPinia());
  const getStub = sinon.stub(api, 'get');
  getStub.onCall(0).resolves({ data: [{ id: 'r1', name: 'MEDECIN' }] } as any);
  getStub.onCall(1).resolves({ data: [{ id: '1', email: 'n@c.t' }] } as any);
  const postStub = sinon.stub(api, 'post').resolves({ data: { id: '1' } } as any);

  const store = useUserStore();
  await store.fetchRoles();
  t.equal(store.roles.length, 1);

  await store.createUser({
    email: 'n@c.t',
    password: 'Admin123!',
    firstName: 'N',
    lastName: 'C',
    role: 'MEDECIN',
  });
  t.equal(store.users.length, 1);
  t.ok(postStub.calledWith('/users'));

  getStub.restore();
  postStub.restore();
  t.end();
});

test('user store: update / remove / roles CRUD', async (t) => {
  setActivePinia(createPinia());
  const getStub = sinon.stub(api, 'get').resolves({ data: [] } as any);
  const patchStub = sinon.stub(api, 'patch').resolves({ data: {} } as any);
  const putStub = sinon.stub(api, 'put').resolves({ data: {} } as any);
  const postStub = sinon.stub(api, 'post').resolves({ data: { id: 'r2' } } as any);
  const delStub = sinon.stub(api, 'delete').resolves({ data: {} } as any);

  const store = useUserStore();
  await store.updateUser('1', { firstName: 'N', isActive: true });
  t.ok(patchStub.called);
  await store.removeUser('1');
  t.ok(delStub.called);
  await store.fetchPermissions();
  await store.createRole('INFIRMIER', ['patients:read']);
  t.ok(postStub.called);
  await store.saveRolePermissions('r1', ['patients:read']);
  await store.removeRole('r1');

  getStub.restore();
  patchStub.restore();
  putStub.restore();
  postStub.restore();
  delStub.restore();
  t.end();
});

/**
 * UNIT FE — patients / dashboard / audit service
 */
import test from 'tape';
import sinon from 'sinon';
import api from '../../src/services/api';
import * as patients from '../../src/services/patients';

test('patients.listPatients GET /patients avec params', async (t) => {
  const stub = sinon.stub(api, 'get').resolves({ data: [] } as any);
  await patients.listPatients({ service: 'URGENCE', search: 'Ahmed' });
  t.ok(stub.calledWith('/patients', { params: { service: 'URGENCE', search: 'Ahmed' } }));
  stub.restore();
  t.end();
});

test('patients.get / create / update / delete', async (t) => {
  const getStub = sinon.stub(api, 'get').resolves({ data: { id: '1' } } as any);
  const postStub = sinon.stub(api, 'post').resolves({ data: { id: '2' } } as any);
  const putStub = sinon.stub(api, 'put').resolves({ data: { id: '1' } } as any);
  const delStub = sinon.stub(api, 'delete').resolves({ data: { ok: true } } as any);

  await patients.getPatient('1');
  await patients.createPatient({
    firstName: 'A',
    lastName: 'B',
    hospitalizationDate: '2026-08-12',
    service: 'GENERAL',
    status: 'STABLE',
    specialty: { notes: '' },
  });
  await patients.updatePatient('1', {
    firstName: 'A',
    lastName: 'B',
    hospitalizationDate: '2026-08-12',
    service: 'GENERAL',
    status: 'STABLE',
    specialty: { notes: '' },
  });
  await patients.deletePatient('1');

  t.ok(getStub.calledWith('/patients/1'));
  t.ok(postStub.calledWith('/patients'));
  t.ok(putStub.calledWith('/patients/1'));
  t.ok(delStub.calledWith('/patients/1'));

  getStub.restore();
  postStub.restore();
  putStub.restore();
  delStub.restore();
  t.end();
});

test('patients.getDashboardStats + getAuditLogs', async (t) => {
  const stub = sinon.stub(api, 'get');
  stub.onFirstCall().resolves({ data: { total: 3 } } as any);
  stub.onSecondCall().resolves({ data: [] } as any);
  await patients.getDashboardStats();
  await patients.getAuditLogs();
  t.ok(stub.calledWith('/dashboard/stats'));
  t.ok(stub.calledWith('/audit-logs'));
  stub.restore();
  t.end();
});

/**
 * UNIT FE — prescriptions API
 */
import test from 'tape';
import sinon from 'sinon';
import api from '../../src/services/api';
import * as prescriptions from '../../src/api/prescriptions.api';

const sample = {
  id: 'rx1',
  patientId: 'p1',
  doctorId: 'u-doc',
  doctorName: 'Léa Urg',
  prescribedAt: '2026-08-12T14:30:00.000Z',
  status: 'ACTIVE' as const,
  notes: null,
  medications: [
    {
      id: 'm1',
      name: 'Paracétamol',
      dosage: '1g',
      frequency: '3x/jour',
      duration: '5 jours',
    },
  ],
};

test('prescriptions.api: GET list / detail / patient', async (t) => {
  const stub = sinon.stub(api, 'get').resolves({ data: [sample] } as any);
  await prescriptions.getPrescriptions({ status: 'ACTIVE', patientId: 'p1' });
  t.ok(
    stub.calledWith('/prescriptions', { params: { status: 'ACTIVE', patientId: 'p1' } })
  );

  stub.resolves({ data: sample } as any);
  await prescriptions.getPrescription('rx1');
  t.ok(stub.calledWith('/prescriptions/rx1'));

  await prescriptions.getPatientPrescriptions('p1');
  t.ok(stub.calledWith('/patients/p1/prescriptions'));
  stub.restore();
  t.end();
});

test('prescriptions.api: POST sans doctorId + PATCH cancel', async (t) => {
  const postStub = sinon.stub(api, 'post').resolves({ data: sample } as any);
  const patchStub = sinon.stub(api, 'patch').resolves({ data: { ...sample, status: 'CANCELLED' } } as any);

  const payload = {
    patientId: 'p1',
    prescribedAt: '2026-08-12T14:30:00.000Z',
    notes: null,
    medications: [
      { name: 'Paracétamol', dosage: '1g', frequency: '3x/jour', duration: '5 jours' },
    ],
  };
  await prescriptions.createPrescription(payload);
  t.ok(postStub.calledWith('/prescriptions', payload));
  t.equal(Object.prototype.hasOwnProperty.call(postStub.firstCall.args[1], 'doctorId'), false);

  await prescriptions.cancelPrescription('rx1');
  t.ok(patchStub.calledWith('/prescriptions/rx1/cancel'));

  postStub.restore();
  patchStub.restore();
  t.end();
});

/**
 * UNIT FE — medical-history API
 */
import test from 'tape';
import sinon from 'sinon';
import api from '../../src/services/api';
import * as medicalHistory from '../../src/api/medical-history.api';

const sampleList = {
  items: [
    {
      id: 'mh1',
      patientId: 'p1',
      eventType: 'PRESCRIPTION' as const,
      occurredAt: '2026-08-12T14:30:00.000Z',
      service: 'URGENCE' as const,
      doctorId: 'u-doc',
      doctorName: 'Léa Urg',
      summary: 'Nouvelle ordonnance créée',
      metadata: { prescriptionId: 'rx1', action: 'CREATED' },
    },
  ],
  total: 1,
};

test('medical-history.api: GET list avec filtres', async (t) => {
  const stub = sinon.stub(api, 'get').resolves({ data: sampleList } as any);
  const data = await medicalHistory.getMedicalHistory({
    type: 'PRESCRIPTION',
    service: 'URGENCE',
    patientId: 'p1',
    from: '2026-08-01T00:00:00.000Z',
    to: '2026-08-31T23:59:59.999Z',
  });
  t.equal(data.total, 1);
  t.equal(data.items[0].eventType, 'PRESCRIPTION');
  t.ok(
    stub.calledWith('/medical-history', {
      params: {
        type: 'PRESCRIPTION',
        service: 'URGENCE',
        patientId: 'p1',
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-31T23:59:59.999Z',
      },
    })
  );
  stub.restore();
  t.end();
});

test('medical-history.api: GET patient history', async (t) => {
  const stub = sinon.stub(api, 'get').resolves({ data: sampleList } as any);
  const data = await medicalHistory.getPatientMedicalHistory('p1');
  t.equal(data.items.length, 1);
  t.ok(stub.calledWith('/patients/p1/medical-history'));
  stub.restore();
  t.end();
});

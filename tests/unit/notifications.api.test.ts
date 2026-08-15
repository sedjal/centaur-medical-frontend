/**
 * UNIT FE — notifications API
 */
import test from 'tape';
import sinon from 'sinon';
import api from '../../src/services/api';
import * as notifications from '../../src/api/notifications.api';

const sample = {
  id: 'n1',
  recipientId: 'u-sec',
  patientId: null,
  type: 'GENERAL' as const,
  title: 'Hello',
  message: 'World',
  scheduledAt: '2026-08-12T14:30:00.000Z',
  sentAt: '2026-08-12T14:30:00.000Z',
  readAt: null,
  status: 'SENT' as const,
  createdBy: 'u-med',
  createdAt: '2026-08-12T14:30:00.000Z',
  updatedAt: '2026-08-12T14:30:00.000Z',
};

const sampleList = { items: [sample], total: 1 };

test('notifications.api: GET list + detail', async (t) => {
  const stub = sinon.stub(api, 'get').resolves({ data: sampleList } as any);
  const data = await notifications.getNotifications({ read: false, type: 'GENERAL' });
  t.equal(data.total, 1);
  t.ok(
    stub.calledWith('/notifications', {
      params: { read: 'false', type: 'GENERAL' },
    })
  );

  stub.resolves({ data: sample } as any);
  await notifications.getNotification('n1');
  t.ok(stub.calledWith('/notifications/n1'));
  stub.restore();
  t.end();
});

test('notifications.api: POST create + PATCH read/cancel', async (t) => {
  const postStub = sinon.stub(api, 'post').resolves({ data: sample } as any);
  const patchStub = sinon
    .stub(api, 'patch')
    .onFirstCall()
    .resolves({ data: { ...sample, status: 'READ' } } as any)
    .onSecondCall()
    .resolves({ data: { ...sample, status: 'CANCELLED' } } as any);

  const payload = {
    recipientId: 'u-sec',
    patientId: null,
    type: 'GENERAL' as const,
    title: 'Hello',
    message: 'World',
    scheduledAt: '2026-08-12T14:30:00.000Z',
  };
  await notifications.createNotification(payload);
  t.ok(postStub.calledWith('/notifications', payload));

  await notifications.markNotificationAsRead('n1');
  t.ok(patchStub.calledWith('/notifications/n1/read'));

  await notifications.cancelNotification('n1');
  t.ok(patchStub.calledWith('/notifications/n1/cancel'));

  postStub.restore();
  patchStub.restore();
  t.end();
});

/**
 * UNIT FE — documents API (fetch + FormData, pas Content-Type JSON)
 */
import '../setup-dom';
import test from 'tape';
import sinon from 'sinon';
import * as documents from '../../src/api/documents.api';
import { documentsApiMessage, documentTypeLabel, documentFileKind, documentDisplayName, formatByteSize } from '../../src/utils/documents';
import { ApiError } from '../../src/api/client';

const sample = {
  id: 'd1',
  patientId: 'p1',
  docType: 'ECG' as const,
  filename: 'ecg.pdf',
  mimeType: 'application/pdf',
  byteSize: 1200,
  uploadedBy: 'u1',
  uploadedByName: 'Léa Urg',
  createdAt: '2026-08-16T10:00:00.000Z',
};

test('documents.api: GET list + DELETE Bearer sans JSON Content-Type', async (t) => {
  localStorage.setItem('centaur_token', 'tok-123');
  const fetchStub = sinon.stub(globalThis, 'fetch');
  fetchStub.onFirstCall().resolves(
    new Response(JSON.stringify([sample]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  );
  fetchStub.onSecondCall().resolves(new Response(JSON.stringify({ ok: true }), { status: 200 }));

  try {
    const list = await documents.listPatientDocuments('p1');
    t.equal(list[0].filename, 'ecg.pdf');
    const [listUrl, listInit] = fetchStub.firstCall.args as [string, RequestInit];
    t.equal(listUrl, '/api/patients/p1/documents');
    t.equal((listInit.headers as Record<string, string>).Authorization, 'Bearer tok-123');

    await documents.deletePatientDocument('p1', 'd1');
    const [delUrl, delInit] = fetchStub.secondCall.args as [string, RequestInit];
    t.equal(delUrl, '/api/patients/p1/documents/d1');
    t.equal(delInit.method, 'DELETE');
  } finally {
    fetchStub.restore();
    localStorage.removeItem('centaur_token');
    t.end();
  }
});

test('documents.api: POST FormData sans Content-Type application/json', async (t) => {
  localStorage.setItem('centaur_token', 'tok-123');
  const fetchStub = sinon.stub(globalThis, 'fetch').resolves(
    new Response(JSON.stringify(sample), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    })
  );
  try {
    const file = new File([Buffer.from('%PDF-1.4')], 'ecg.pdf', { type: 'application/pdf' });
    await documents.uploadPatientDocument('p1', 'ECG', file);
    const [, init] = fetchStub.firstCall.args as [string, RequestInit];
    t.equal(init.method, 'POST');
    t.ok(init.body instanceof FormData);
    const headers = init.headers as Record<string, string>;
    t.equal(headers.Authorization, 'Bearer tok-123');
    t.equal(headers['Content-Type'], undefined);
    t.equal(headers['content-type'], undefined);
  } finally {
    fetchStub.restore();
    localStorage.removeItem('centaur_token');
    t.end();
  }
});

test('documents.api: 403/413 messages', (t) => {
  t.match(documentsApiMessage(new ApiError('x', 403), 'load'), /autorisation/i);
  t.match(documentsApiMessage(new ApiError('x', 413), 'upload'), /5 Mo/);
  t.match(documentsApiMessage(new ApiError('x', 404), 'delete'), /introuvable/i);
  t.equal(documentTypeLabel('CARTE_GROUPE'), 'Carte de groupage');
  t.equal(documentFileKind('application/pdf'), 'PDF');
  t.equal(documentFileKind('image/png'), 'PNG');
  t.equal(documentDisplayName('AUTRE', 'PV_essai_clinique_2026.pdf'), 'Autre — PV essai clinique 2026');
  t.match(formatByteSize(2048), /Ko/);
  t.end();
});

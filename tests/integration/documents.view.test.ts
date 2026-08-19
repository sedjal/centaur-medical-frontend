/**
 * INTÉGRATION FE — panneau documents dossier
 */
import '../setup-dom';
import test from 'tape';
import sinon from 'sinon';
import PatientDocuments from '../../src/components/document/PatientDocuments';
import { mountView, flushPromises, sessionUser } from './mount';

const docs = [
  {
    id: 'd1',
    patientId: 'p1',
    docType: 'ECG',
    filename: 'trace-ecg.pdf',
    mimeType: 'application/pdf',
    byteSize: 2048,
    uploadedBy: 'u1',
    uploadedByName: 'Léa Urg',
    createdAt: '2026-08-16T10:00:00.000Z',
  },
];

test('intégration documents: liste visible si documents:read', async (t) => {
  const fetchStub = sinon.stub(globalThis, 'fetch').resolves(
    new Response(JSON.stringify(docs), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  );
  try {
    const { wrapper } = await mountView(PatientDocuments, {
      authenticated: true,
      user: sessionUser({
        permissions: ['documents:read', 'service:urgence'] as never,
      }),
      props: { patientId: 'p1' },
    });
    await flushPromises();
    t.match(wrapper.text(), /Documents/);
    t.match(wrapper.text(), /trace-ecg.pdf/);
    t.match(wrapper.text(), /ECG/);
    t.equal(wrapper.text().includes('Ajouter un document'), false);
    t.equal(wrapper.text().includes('Ajouter'), false);
    wrapper.unmount();
  } finally {
    fetchStub.restore();
    t.end();
  }
});

test('intégration documents: upload FormData si documents:create', async (t) => {
  const fetchStub = sinon.stub(globalThis, 'fetch').callsFake(async (input, init) => {
    const url = String(input);
    if (String(init?.method || 'GET') === 'POST') {
      return new Response(
        JSON.stringify({ ...docs[0], id: 'd2', filename: 'new.pdf' }),
        { status: 201, headers: { 'content-type': 'application/json' } }
      );
    }
    if (url.includes('/documents')) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('{}', { status: 404 });
  });
  try {
    const { wrapper } = await mountView(PatientDocuments, {
      authenticated: true,
      user: sessionUser({
        permissions: ['documents:read', 'documents:create', 'service:urgence'] as never,
      }),
      props: { patientId: 'p1' },
    });
    await flushPromises();
    t.match(wrapper.text(), /Ajouter un document/);
    const addBtn = wrapper.findAll('button').find((b) => /Ajouter un document/.test(b.text()));
    t.ok(addBtn);
    await addBtn!.trigger('click');
    await flushPromises();
    const fileInput = wrapper.find('#patient-doc-file');
    t.ok(fileInput.exists());
    const file = new File([Buffer.from('%PDF-1.4')], 'new.pdf', { type: 'application/pdf' });
    Object.defineProperty(fileInput.element, 'files', {
      configurable: true,
      value: [file],
    });
    await fileInput.trigger('change');
    await wrapper.find('form.doc-upload').trigger('submit');
    await flushPromises();
    const postCall = fetchStub.getCalls().find((c) => String((c.args[1] as RequestInit | undefined)?.method) === 'POST');
    t.ok(postCall);
    t.ok((postCall!.args[1] as RequestInit).body instanceof FormData);
    t.equal(((postCall!.args[1] as RequestInit).headers as Record<string, string>)['Content-Type'], undefined);
    wrapper.unmount();
  } finally {
    fetchStub.restore();
    t.end();
  }
});

test('intégration documents: sans documents:read → accès restreint', async (t) => {
  const fetchStub = sinon.stub(globalThis, 'fetch');
  try {
    const { wrapper } = await mountView(PatientDocuments, {
      authenticated: true,
      user: sessionUser({ permissions: ['patients:read'] as never }),
      props: { patientId: 'p1' },
    });
    await flushPromises();
    t.match(wrapper.text(), /Accès restreint/);
    t.equal(fetchStub.called, false);
    wrapper.unmount();
  } finally {
    fetchStub.restore();
    t.end();
  }
});

test('intégration documents: supprimer si documents:delete', async (t) => {
  const fetchStub = sinon.stub(globalThis, 'fetch').callsFake(async (_input, init) => {
    const method = String(init?.method || 'GET');
    if (method === 'DELETE') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(docs), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  try {
    const { wrapper } = await mountView(PatientDocuments, {
      authenticated: true,
      user: sessionUser({
        permissions: ['documents:read', 'documents:delete', 'service:urgence'] as never,
      }),
      props: { patientId: 'p1' },
    });
    await flushPromises();
    const delBtn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Supprimer');
    t.ok(delBtn);
    await delBtn!.trigger('click');
    await flushPromises();
    t.match(wrapper.text(), /Supprimer le document/);
    const confirm = wrapper.findAll('button').find((b) => b.text().trim() === 'Supprimer');
    t.ok(confirm);
    await confirm!.trigger('click');
    await flushPromises();
    const delCall = fetchStub
      .getCalls()
      .find((c) => String((c.args[1] as RequestInit | undefined)?.method) === 'DELETE');
    t.ok(delCall);
    t.equal(String(delCall!.args[0]), '/api/patients/p1/documents/d1');
    wrapper.unmount();
  } finally {
    fetchStub.restore();
    t.end();
  }
});

/**
 * INTÉGRATION FE — panneau comptes rendus dossier
 */
import '../setup-dom';
import test from 'tape';
import sinon from 'sinon';
import PatientClinicalNotes from '../../src/components/clinical-note/PatientClinicalNotes';
import api from '../../src/services/api';
import { mountView, flushPromises, sessionUser } from './mount';

const notes = [
  {
    id: 'n1',
    patientId: 'p1',
    title: 'Compte rendu urgence',
    body: 'Examen clinique rassurant.',
    authorId: 'u1',
    authorName: 'Léa Urg',
    createdAt: '2026-08-17T14:00:00.000Z',
  },
];

test('intégration clinical-notes: liste visible si reports:read', async (t) => {
  const stub = sinon.stub(api, 'get').resolves({ data: notes } as any);
  try {
    const { wrapper } = await mountView(PatientClinicalNotes, {
      authenticated: true,
      user: sessionUser({
        permissions: ['reports:read', 'service:urgence'] as never,
      }),
      props: { patientId: 'p1' },
    });
    await flushPromises();
    t.match(wrapper.text(), /Comptes rendus/);
    t.match(wrapper.text(), /Compte rendu urgence/);
    t.equal(wrapper.text().includes('Enregistrer le compte rendu'), false);
    t.equal(wrapper.text().includes('Examen clinique rassurant'), false);
    t.equal(
      wrapper.findAll('button').some((b) => b.attributes('aria-label') === 'Supprimer'),
      false
    );
    const voir = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Voir');
    t.ok(voir);
    await voir!.trigger('click');
    await flushPromises();
    t.match(wrapper.text(), /Examen clinique rassurant/);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration clinical-notes: formulaire si reports:create', async (t) => {
  const getStub = sinon.stub(api, 'get').resolves({ data: [] } as any);
  const postStub = sinon.stub(api, 'post').resolves({
    data: { ...notes[0], id: 'n2', title: 'Nouveau', body: 'Note.' },
  } as any);
  try {
    const { wrapper } = await mountView(PatientClinicalNotes, {
      authenticated: true,
      user: sessionUser({
        permissions: ['reports:read', 'reports:create', 'service:urgence'] as never,
      }),
      props: { patientId: 'p1' },
    });
    await flushPromises();
    t.match(wrapper.text(), /Ajouter un compte rendu/);
    const addBtn = wrapper.findAll('button').find((b) => /Ajouter un compte rendu/.test(b.text()));
    t.ok(addBtn);
    await addBtn!.trigger('click');
    await flushPromises();
    t.match(wrapper.text(), /Enregistrer le compte rendu/);
    const inputs = wrapper.findAll('input');
    t.ok(inputs.length > 0);
    await inputs[0].setValue('Nouveau');
    await wrapper.find('#clinical-note-body').setValue('Note.');
    await wrapper.find('form.note-form').trigger('submit');
    await flushPromises();
    t.ok(postStub.calledOnce);
    t.deepEqual(postStub.firstCall.args[1], { title: 'Nouveau', body: 'Note.' });
    wrapper.unmount();
  } finally {
    getStub.restore();
    postStub.restore();
    t.end();
  }
});

test('intégration clinical-notes: sans reports:read → accès restreint', async (t) => {
  const stub = sinon.stub(api, 'get');
  try {
    const { wrapper } = await mountView(PatientClinicalNotes, {
      authenticated: true,
      user: sessionUser({ permissions: ['patients:read'] as never }),
      props: { patientId: 'p1' },
    });
    await flushPromises();
    t.match(wrapper.text(), /Accès restreint/);
    t.equal(stub.called, false);
    wrapper.unmount();
  } finally {
    stub.restore();
    t.end();
  }
});

test('intégration clinical-notes: supprimer si reports:create', async (t) => {
  const getStub = sinon.stub(api, 'get').resolves({ data: notes } as any);
  const delStub = sinon.stub(api, 'delete').resolves({ data: { ok: true } } as any);
  try {
    const { wrapper } = await mountView(PatientClinicalNotes, {
      authenticated: true,
      user: sessionUser({
        permissions: ['reports:read', 'reports:create', 'service:urgence'] as never,
      }),
      props: { patientId: 'p1' },
    });
    await flushPromises();
    const delBtn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Supprimer');
    t.ok(delBtn);
    await delBtn!.trigger('click');
    await flushPromises();
    t.match(wrapper.text(), /Supprimer le compte rendu/);
    const confirm = wrapper.findAll('button').find((b) => b.text().trim() === 'Supprimer');
    t.ok(confirm);
    await confirm!.trigger('click');
    await flushPromises();
    t.ok(delStub.calledOnce);
    t.equal(delStub.firstCall.args[0], '/patients/p1/clinical-notes/n1');
    wrapper.unmount();
  } finally {
    getStub.restore();
    delStub.restore();
    t.end();
  }
});

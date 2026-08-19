/**
 * UNIT FE — clinical notes API
 */
import '../setup-dom';
import test from 'tape';
import sinon from 'sinon';
import api from '../../src/services/api';
import * as notes from '../../src/api/clinical-notes.api';
import { clinicalNotesApiMessage, validateClinicalNoteForm } from '../../src/utils/clinicalNotes';
import { ApiError } from '../../src/api/client';

const sample = {
  id: 'n1',
  patientId: 'p1',
  title: 'Compte rendu',
  body: 'Patient stable.',
  authorId: 'u1',
  authorName: 'Léa Urg',
  createdAt: '2026-08-17T14:00:00.000Z',
};

test('clinical-notes.api: GET list / detail + POST + DELETE', async (t) => {
  const getStub = sinon.stub(api, 'get');
  getStub.onFirstCall().resolves({ data: [sample] } as any);
  getStub.onSecondCall().resolves({ data: sample } as any);
  const postStub = sinon.stub(api, 'post').resolves({ data: sample } as any);
  const delStub = sinon.stub(api, 'delete').resolves({ data: { ok: true } } as any);

  try {
    const list = await notes.listPatientClinicalNotes('p1');
    t.equal(list[0].title, 'Compte rendu');
    t.ok(getStub.calledWith('/patients/p1/clinical-notes'));

    await notes.getPatientClinicalNote('p1', 'n1');
    t.ok(getStub.calledWith('/patients/p1/clinical-notes/n1'));

    await notes.createPatientClinicalNote('p1', { title: 'Compte rendu', body: 'Patient stable.' });
    t.ok(
      postStub.calledWith('/patients/p1/clinical-notes', {
        title: 'Compte rendu',
        body: 'Patient stable.',
      })
    );

    await notes.deletePatientClinicalNote('p1', 'n1');
    t.ok(delStub.calledWith('/patients/p1/clinical-notes/n1'));
  } finally {
    getStub.restore();
    postStub.restore();
    delStub.restore();
    t.end();
  }
});

test('clinical-notes: validation + messages', (t) => {
  t.equal(validateClinicalNoteForm('', 'x').title, 'Le titre est obligatoire.');
  t.equal(validateClinicalNoteForm('Titre', '  ').body, 'Le compte rendu ne peut pas être vide.');
  t.equal(Object.keys(validateClinicalNoteForm('Titre', 'Corps')).length, 0);
  t.match(clinicalNotesApiMessage(new ApiError('x', 403), 'load'), /autorisation/i);
  t.match(clinicalNotesApiMessage(new ApiError('x', 403), 'create'), /écrire/i);
  t.match(clinicalNotesApiMessage(new ApiError('x', 403), 'delete'), /supprimer/i);
  t.match(clinicalNotesApiMessage(new ApiError('x', 404), 'load'), /introuvable/i);
  t.end();
});

import { ref } from 'vue';
import * as clinicalNotesApi from '../api/clinical-notes.api';
import type { ClinicalNote, ClinicalNoteCreatePayload } from '../types';
import { useApiError } from './useApiError';
import { clinicalNotesApiMessage } from '../utils/clinicalNotes';

export function useClinicalNotes() {
  const notes = ref<ClinicalNote[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const deletingId = ref<string | null>(null);
  const { error, errorMessage, setError, clearError } = useApiError();
  const actionMessage = ref<string | null>(null);

  function applyError(err: unknown, context: 'load' | 'create' | 'delete') {
    setError(err);
    actionMessage.value = clinicalNotesApiMessage(err, context);
  }

  async function fetchPatientClinicalNotes(patientId: string) {
    loading.value = true;
    clearError();
    actionMessage.value = null;
    try {
      notes.value = await clinicalNotesApi.listPatientClinicalNotes(patientId);
      return notes.value;
    } catch (err) {
      applyError(err, 'load');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createClinicalNote(patientId: string, payload: ClinicalNoteCreatePayload) {
    saving.value = true;
    clearError();
    actionMessage.value = null;
    try {
      const created = await clinicalNotesApi.createPatientClinicalNote(patientId, payload);
      notes.value = [created, ...notes.value.filter((n) => n.id !== created.id)];
      return created;
    } catch (err) {
      applyError(err, 'create');
      throw err;
    } finally {
      saving.value = false;
    }
  }

  async function removeClinicalNote(patientId: string, noteId: string) {
    deletingId.value = noteId;
    clearError();
    actionMessage.value = null;
    try {
      await clinicalNotesApi.deletePatientClinicalNote(patientId, noteId);
      notes.value = notes.value.filter((n) => n.id !== noteId);
    } catch (err) {
      applyError(err, 'delete');
      throw err;
    } finally {
      deletingId.value = null;
    }
  }

  return {
    notes,
    loading,
    saving,
    deletingId,
    error,
    errorMessage,
    actionMessage,
    fetchPatientClinicalNotes,
    createClinicalNote,
    removeClinicalNote,
    clearError,
  };
}

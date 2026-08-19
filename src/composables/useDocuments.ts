import { ref } from 'vue';
import * as documentsApi from '../api/documents.api';
import type { DocumentType, PatientDocument } from '../types';
import { useApiError } from './useApiError';
import { documentsApiMessage } from '../utils/documents';

export function useDocuments() {
  const documents = ref<PatientDocument[]>([]);
  const loading = ref(false);
  const uploading = ref(false);
  const deletingId = ref<string | null>(null);
  const { error, errorMessage, setError, clearError } = useApiError();
  const actionMessage = ref<string | null>(null);

  function applyError(err: unknown, context: 'load' | 'upload' | 'delete' | 'download') {
    setError(err);
    actionMessage.value = documentsApiMessage(err, context);
  }

  async function fetchPatientDocuments(patientId: string) {
    loading.value = true;
    clearError();
    actionMessage.value = null;
    try {
      documents.value = await documentsApi.listPatientDocuments(patientId);
      return documents.value;
    } catch (err) {
      applyError(err, 'load');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function uploadDocument(patientId: string, type: DocumentType, file: File) {
    uploading.value = true;
    clearError();
    actionMessage.value = null;
    try {
      const created = await documentsApi.uploadPatientDocument(patientId, type, file);
      documents.value = [created, ...documents.value.filter((d) => d.id !== created.id)];
      return created;
    } catch (err) {
      applyError(err, 'upload');
      throw err;
    } finally {
      uploading.value = false;
    }
  }

  async function downloadDocument(patientId: string, documentId: string) {
    clearError();
    actionMessage.value = null;
    try {
      return await documentsApi.downloadPatientDocumentFile(patientId, documentId);
    } catch (err) {
      applyError(err, 'download');
      throw err;
    }
  }

  async function removeDocument(patientId: string, documentId: string) {
    deletingId.value = documentId;
    clearError();
    actionMessage.value = null;
    try {
      await documentsApi.deletePatientDocument(patientId, documentId);
      documents.value = documents.value.filter((d) => d.id !== documentId);
    } catch (err) {
      applyError(err, 'delete');
      throw err;
    } finally {
      deletingId.value = null;
    }
  }

  return {
    documents,
    loading,
    uploading,
    deletingId,
    error,
    errorMessage,
    actionMessage,
    fetchPatientDocuments,
    uploadDocument,
    downloadDocument,
    removeDocument,
    clearError,
  };
}

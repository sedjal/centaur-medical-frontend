import { defineComponent, onMounted, onBeforeUnmount, ref, computed, watch } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useDocuments } from '../../composables/useDocuments';
import type { DocumentType, PatientDocument } from '../../types';
import {
  DOCUMENT_TYPES,
  canPreviewDocument,
  documentDisplayName,
  documentFileKind,
  documentTypeLabel,
  formatByteSize,
} from '../../utils/documents';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Select,
  ConfirmDialog,
  Modal,
  CmIcon,
  type DataTableColumn,
} from '../ui';

export default defineComponent({
  name: 'PatientDocuments',
  props: {
    patientId: { type: String, required: true },
  },
  setup(props) {
    const auth = useAuthStore();
    const canRead = computed(() => auth.hasPermission('documents:read'));
    const canCreate = computed(() => auth.hasPermission('documents:create'));
    const canDelete = computed(() => auth.hasPermission('documents:delete'));

    const uploadOpen = ref(false);
    const selectedType = ref<DocumentType>('AUTRE');
    const selectedFile = ref<File | null>(null);
    const deleteTarget = ref<PatientDocument | null>(null);
    const successMessage = ref<string | null>(null);
    const preview = ref<{ url: string; mimeType: string; filename: string } | null>(null);

    const {
      documents,
      loading,
      uploading,
      deletingId,
      actionMessage,
      fetchPatientDocuments,
      uploadDocument,
      downloadDocument,
      removeDocument,
    } = useDocuments();

    async function load() {
      if (!canRead.value || !props.patientId) return;
      try {
        await fetchPatientDocuments(props.patientId);
      } catch {
        /* actionMessage */
      }
    }

    onMounted(() => {
      void load();
    });

    watch(
      () => props.patientId,
      () => {
        void load();
      }
    );

    onBeforeUnmount(() => {
      if (preview.value) URL.revokeObjectURL(preview.value.url);
    });

    function closePreview() {
      if (preview.value) URL.revokeObjectURL(preview.value.url);
      preview.value = null;
    }

    function resetUploadForm() {
      selectedType.value = 'AUTRE';
      selectedFile.value = null;
      const el = document.getElementById('patient-doc-file') as HTMLInputElement | null;
      if (el) el.value = '';
    }

    function onFileChange(ev: Event) {
      const input = ev.target as HTMLInputElement;
      selectedFile.value = input.files && input.files[0] ? input.files[0] : null;
    }

    async function onUpload() {
      if (!canCreate.value || !selectedFile.value) return;
      try {
        await uploadDocument(props.patientId, selectedType.value, selectedFile.value);
        successMessage.value = 'Document ajouté.';
        resetUploadForm();
        uploadOpen.value = false;
        await load();
      } catch {
        /* actionMessage */
      }
    }

    async function onDownload(doc: PatientDocument) {
      try {
        const file = await downloadDocument(props.patientId, doc.id);
        const url = URL.createObjectURL(file.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename || doc.filename;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        /* actionMessage */
      }
    }

    function downloadPreview() {
      if (!preview.value) return;
      const a = document.createElement('a');
      a.href = preview.value.url;
      a.download = preview.value.filename;
      a.click();
    }

    async function onPreview(doc: PatientDocument) {
      if (!canPreviewDocument(doc.mimeType)) {
        await onDownload(doc);
        return;
      }
      try {
        const file = await downloadDocument(props.patientId, doc.id);
        if (preview.value) URL.revokeObjectURL(preview.value.url);
        preview.value = {
          url: URL.createObjectURL(file.blob),
          mimeType: file.mimeType || doc.mimeType,
          filename: file.filename || doc.filename,
        };
      } catch {
        /* actionMessage */
      }
    }

    async function confirmDelete() {
      if (!deleteTarget.value || !canDelete.value) return;
      try {
        await removeDocument(props.patientId, deleteTarget.value.id);
        deleteTarget.value = null;
        successMessage.value = 'Document supprimé.';
      } catch {
        deleteTarget.value = null;
      }
    }

    const columns = computed<DataTableColumn<PatientDocument>[]>(() => [
      {
        key: 'docType',
        label: 'Document',
        render: (row) => {
          const kind = documentFileKind(row.mimeType);
          return (
            <span class="doc-type-cell">
              <span class="doc-type-cell__icon">
                <CmIcon name="document" size={16} />
              </span>
              <span class="doc-type-cell__text">
                <span class="doc-type-cell__name">{documentDisplayName(row.docType, row.filename)}</span>
                <span class={`doc-kind doc-kind--${kind.toLowerCase()}`}>{kind}</span>
              </span>
            </span>
          );
        },
      },
      {
        key: 'filename',
        label: 'Fichier',
        render: (row) => (
          <span class="doc-file-cell">
            <span class="doc-file-cell__name">{row.filename}</span>
            <span class="doc-file-cell__size">{formatByteSize(row.byteSize)}</span>
          </span>
        ),
      },
      {
        key: 'actions',
        label: '',
        className: 'col-icon-actions',
        render: (row) => (
          <div class="row-actions">
            {canPreviewDocument(row.mimeType) ? (
              <button
                type="button"
                class="table-icon-btn"
                aria-label="Aperçu"
                title="Aperçu"
                onClick={() => void onPreview(row)}
              >
                <CmIcon name="eye" size={16} />
              </button>
            ) : null}
            <button
              type="button"
              class="table-icon-btn"
              aria-label="Télécharger"
              title="Télécharger"
              onClick={() => void onDownload(row)}
            >
              <CmIcon name="download" size={16} />
            </button>
            {canDelete.value ? (
              <button
                type="button"
                class="table-icon-btn table-icon-btn--danger"
                aria-label="Supprimer"
                title="Supprimer"
                onClick={() => {
                  deleteTarget.value = row;
                }}
              >
                <CmIcon name="trash" size={16} />
              </button>
            ) : null}
          </div>
        ),
      },
    ]);

    return () => (
      <div class="documents-section">
        {!canRead.value && (
          <Card title="Documents du dossier" icon="document" padding="none">
            <EmptyState
              title="Accès restreint"
              description="Vous n'avez pas l'autorisation de consulter les documents."
              icon="document"
            />
          </Card>
        )}

        {canRead.value && (
          <Card
            title="Documents du dossier"
            icon="document"
            padding="none"
            actions={
              canCreate.value ? (
                <Button
                  size="sm"
                  onClick={() => {
                    successMessage.value = null;
                    resetUploadForm();
                    uploadOpen.value = true;
                  }}
                >
                  + Ajouter un document
                </Button>
              ) : undefined
            }
          >
            {canRead.value && !loading.value && actionMessage.value && documents.value.length === 0 && (
              <div class="dossier-panel__alerts">
                <ErrorState
                  title="Impossible de charger les documents"
                  message={actionMessage.value}
                  retry={() => void load()}
                />
              </div>
            )}

            {successMessage.value && (
              <p class="doc-success dossier-panel__alerts" role="status">
                {successMessage.value}
              </p>
            )}

            {actionMessage.value && documents.value.length > 0 && (
              <p class="doc-error dossier-panel__alerts" role="alert">
                {actionMessage.value}
              </p>
            )}

            {!(actionMessage.value && documents.value.length === 0) && (
              <DataTable
                columns={columns.value}
                rows={documents.value}
                rowKey="id"
                loading={loading.value && documents.value.length === 0}
                emptyTitle="Aucun document"
                emptyDescription="Aucun fichier n'est encore associé à ce dossier."
              />
            )}
          </Card>
        )}

        <Modal
          open={uploadOpen.value}
          title="Ajouter un document"
          onClose={() => {
            if (!uploading.value) {
              uploadOpen.value = false;
              resetUploadForm();
            }
          }}
        >
          <form
            class="doc-upload"
            onSubmit={(ev: Event) => {
              ev.preventDefault();
              void onUpload();
            }}
          >
            <Select
              label="Type"
              value={selectedType.value}
              required
              options={DOCUMENT_TYPES.map((t) => ({ value: t, label: documentTypeLabel(t) }))}
              onChange={(v: string) => {
                selectedType.value = v as DocumentType;
              }}
            />
            <div class="cm-field">
              <label class="cm-field__label" for="patient-doc-file">
                Fichier
              </label>
              <input
                id="patient-doc-file"
                class="cm-input"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={onFileChange}
              />
              <p class="cm-field__hint">PDF, Word, JPEG ou PNG — 5 Mo max.</p>
            </div>
            <Button type="submit" size="sm" loading={uploading.value} disabled={!selectedFile.value}>
              Ajouter
            </Button>
          </form>
        </Modal>

        <Modal
          open={Boolean(preview.value)}
          title="Aperçu du document"
          size="lg"
          onClose={closePreview}
          footer={
            preview.value ? (
              <Button size="sm" onClick={downloadPreview}>
                Télécharger
              </Button>
            ) : undefined
          }
        >
          {preview.value ? (
            <p class="doc-preview-name">{preview.value.filename}</p>
          ) : null}
          {preview.value?.mimeType === 'application/pdf' ? (
            <iframe class="doc-preview" src={preview.value.url} title={preview.value.filename} />
          ) : preview.value ? (
            <img class="doc-preview-img" src={preview.value.url} alt={preview.value.filename} />
          ) : null}
        </Modal>

        <ConfirmDialog
          open={Boolean(deleteTarget.value)}
          title="Supprimer le document"
          message="Êtes-vous sûr de vouloir supprimer ce document ? L'événement d'historique sera conservé."
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          danger
          loading={Boolean(deletingId.value)}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            deleteTarget.value = null;
          }}
        />
      </div>
    );
  },
});

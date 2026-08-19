import { defineComponent, onMounted, ref, computed, watch } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useClinicalNotes } from '../../composables/useClinicalNotes';
import type { ClinicalNote } from '../../types';
import {
  CLINICAL_NOTE_BODY_MAX,
  CLINICAL_NOTE_TITLE_MAX,
  validateClinicalNoteForm,
} from '../../utils/clinicalNotes';
import { formatDate } from '../../utils/permissions';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  ConfirmDialog,
  CmIcon,
  type DataTableColumn,
  defineDataTableColumns,
} from '../ui';

export default defineComponent({
  name: 'PatientClinicalNotes',
  props: {
    patientId: { type: String, required: true },
  },
  setup(props) {
    const auth = useAuthStore();
    const canRead = computed(() => auth.hasPermission('reports:read'));
    const canCreate = computed(() => auth.hasPermission('reports:create'));
    const canDelete = computed(() => auth.hasPermission('reports:create'));

    const formOpen = ref(false);
    const title = ref('');
    const body = ref('');
    const fieldErrors = ref<Record<string, string>>({});
    const successMessage = ref<string | null>(null);
    const selected = ref<ClinicalNote | null>(null);
    const deleteTarget = ref<ClinicalNote | null>(null);

    const {
      notes,
      loading,
      saving,
      deletingId,
      actionMessage,
      fetchPatientClinicalNotes,
      createClinicalNote,
      removeClinicalNote,
    } = useClinicalNotes();

    async function load() {
      if (!canRead.value || !props.patientId) return;
      try {
        await fetchPatientClinicalNotes(props.patientId);
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

    function resetForm() {
      title.value = '';
      body.value = '';
      fieldErrors.value = {};
    }

    async function onSubmit(e: Event) {
      e.preventDefault();
      if (!canCreate.value) return;
      successMessage.value = null;
      const errors = validateClinicalNoteForm(title.value, body.value);
      fieldErrors.value = errors;
      if (Object.keys(errors).length > 0) return;
      try {
        await createClinicalNote(props.patientId, {
          title: title.value.trim(),
          body: body.value.trim(),
        });
        resetForm();
        formOpen.value = false;
        successMessage.value = 'Compte rendu enregistré.';
      } catch {
        /* actionMessage */
      }
    }

    async function confirmDelete() {
      if (!deleteTarget.value || !canDelete.value) return;
      try {
        await removeClinicalNote(props.patientId, deleteTarget.value.id);
        if (selected.value?.id === deleteTarget.value.id) selected.value = null;
        deleteTarget.value = null;
        successMessage.value = 'Compte rendu supprimé.';
      } catch {
        deleteTarget.value = null;
      }
    }

    const columns = computed(() => defineDataTableColumns<ClinicalNote>([
      { key: 'title', label: 'Titre' },
      {
        key: 'createdAt',
        label: 'Date',
        render: (row) => formatDate(row.createdAt),
      },
      {
        key: 'authorName',
        label: 'Ajouté par',
        render: (row) => row.authorName || '—',
      },
      {
        key: 'actions',
        label: '',
        className: 'col-icon-actions',
        render: (row) => (
          <div class="row-actions">
            <button
              type="button"
              class="table-icon-btn"
              aria-label="Voir"
              title="Voir"
              onClick={() => {
                selected.value = row;
              }}
            >
              <CmIcon name="eye" size={16} />
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
    ]));

    return () => (
      <div class="clinical-notes-section">
        {!canRead.value && (
          <Card title="Comptes rendus" icon="clipboard" padding="none">
            <EmptyState
              title="Accès restreint"
              description="Vous n'avez pas l'autorisation de consulter les comptes rendus."
              icon="clipboard"
            />
          </Card>
        )}

        {canRead.value && (
          <Card
            title="Comptes rendus"
            icon="clipboard"
            padding="none"
            actions={
              canCreate.value ? (
                <Button
                  size="sm"
                  onClick={() => {
                    successMessage.value = null;
                    resetForm();
                    formOpen.value = true;
                  }}
                >
                  + Ajouter un compte rendu
                </Button>
              ) : undefined
            }
          >
            {!loading.value && notes.value.length === 0 && actionMessage.value && !canCreate.value && (
              <div class="dossier-panel__alerts">
                <ErrorState
                  title="Impossible de charger les comptes rendus"
                  message={actionMessage.value}
                  retry={() => void load()}
                />
              </div>
            )}

            {successMessage.value && (
              <p class="note-success dossier-panel__alerts" role="status">
                {successMessage.value}
              </p>
            )}

            {actionMessage.value && (notes.value.length > 0 || canCreate.value) && (
              <p class="note-error dossier-panel__alerts" role="alert">
                {actionMessage.value}
              </p>
            )}

            <DataTable
              columns={columns.value}
              rows={notes.value}
              rowKey="id"
              loading={loading.value && notes.value.length === 0}
              emptyTitle="Aucun compte rendu clinique"
              emptyDescription="Ajoutez le premier compte rendu pour ce patient."
            />
          </Card>
        )}

        <Modal
          open={formOpen.value}
          title="Ajouter un compte rendu"
          size="lg"
          onClose={() => {
            if (!saving.value) {
              formOpen.value = false;
              resetForm();
            }
          }}
        >
          <form class="note-form" onSubmit={onSubmit} noValidate>
            <Input
              label="Titre"
              required
              value={title.value}
              error={fieldErrors.value.title}
              onInput={(v: string) => {
                title.value = v;
                if (fieldErrors.value.title) {
                  const next = { ...fieldErrors.value };
                  delete next.title;
                  fieldErrors.value = next;
                }
              }}
            />
            <div class={`cm-field ${fieldErrors.value.body ? 'cm-field--error' : ''}`}>
              <label class="cm-field__label" for="clinical-note-body">
                Compte rendu
              </label>
              <textarea
                id="clinical-note-body"
                class="cm-input patient-form__textarea"
                rows={8}
                maxlength={CLINICAL_NOTE_BODY_MAX}
                value={body.value}
                onInput={(ev: Event) => {
                  body.value = (ev.target as HTMLTextAreaElement).value;
                  if (fieldErrors.value.body) {
                    const next = { ...fieldErrors.value };
                    delete next.body;
                    fieldErrors.value = next;
                  }
                }}
              />
              {fieldErrors.value.body ? (
                <p class="cm-field__error" role="alert">
                  {fieldErrors.value.body}
                </p>
              ) : (
                <p class="cm-field__hint">
                  Texte, horodaté à l’enregistrement. {CLINICAL_NOTE_TITLE_MAX} caractères max pour le
                  titre.
                </p>
              )}
            </div>
            <Button type="submit" size="sm" loading={saving.value} disabled={saving.value}>
              Enregistrer le compte rendu
            </Button>
          </form>
        </Modal>

        <Modal
          open={Boolean(selected.value)}
          title={selected.value?.title || 'Compte rendu'}
          size="lg"
          onClose={() => {
            selected.value = null;
          }}
        >
          {selected.value ? (
            <>
              <p class="note-item__meta">
                {formatDate(selected.value.createdAt)}
                {selected.value.authorName ? ` · ${selected.value.authorName}` : ''}
              </p>
              <p class="note-item__body">{selected.value.body}</p>
            </>
          ) : null}
        </Modal>

        <ConfirmDialog
          open={Boolean(deleteTarget.value)}
          title="Supprimer le compte rendu"
          message="Êtes-vous sûr de vouloir supprimer ce compte rendu ? L'événement d'historique sera conservé."
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

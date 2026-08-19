import { defineComponent, onMounted, computed, watch, ref, onBeforeUnmount } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useMedicalHistory } from '../../composables/useMedicalHistory';
import { usePrescriptions } from '../../composables/usePrescriptions';
import { useDocuments } from '../../composables/useDocuments';
import { getPatientClinicalNote } from '../../api/clinical-notes.api';
import type { ClinicalNote, MedicalHistoryItem, Prescription } from '../../types';
import {
  formatMedicalHistoryDate,
  medicalHistoryEventLabel,
  timelineKindBadge,
  timelineTone,
  timelineMetaId,
} from '../../utils/medicalHistory';
import { documentTypeLabel, canPreviewDocument } from '../../utils/documents';
import { serviceLabel } from '../../utils/permissions';
import { prescriptionTitle } from '../../utils/prescriptions';
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  ErrorState,
  Modal,
  ConfirmDialog,
} from '../ui';
import { CmIcon } from '../ui/icons';
import PrescriptionCard from '../prescription/PrescriptionCard';

function metaString(metadata: Record<string, unknown> | null | undefined, key: string): string {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function eventSummary(ev: MedicalHistoryItem): string {
  if (ev.eventType === 'PRESCRIPTION') {
    return ev.summary || 'Nouvelle ordonnance créée';
  }
  if (ev.eventType === 'DOCUMENT_ADDED') {
    const filename = metaString(ev.metadata, 'filename');
    const type = metaString(ev.metadata, 'docType');
    if (filename) return `${filename} ajouté au dossier`;
    if (type) return `${documentTypeLabel(type)} ajouté au dossier`;
    return ev.summary || 'Document ajouté au dossier';
  }
  if (ev.eventType === 'CLINICAL_NOTE') {
    return metaString(ev.metadata, 'title') || ev.summary || 'Compte rendu clinique';
  }
  if (ev.eventType === 'HOSPITALIZATION') {
    return `Admission en ${serviceLabel(ev.service)}`;
  }
  return ev.summary || medicalHistoryEventLabel(ev.eventType);
}

export default defineComponent({
  name: 'PatientMedicalHistory',
  props: {
    patientId: { type: String, required: true },
  },
  setup(props) {
    const auth = useAuthStore();
    const canRead = computed(() => auth.hasPermission('medical_history:read'));
    const canReadRx = computed(() => auth.hasPermission('prescriptions:read'));
    const canCancelRx = computed(() => auth.hasPermission('prescriptions:cancel'));
    const canReadDocs = computed(() => auth.hasPermission('documents:read'));
    const canReadNotes = computed(() => auth.hasPermission('reports:read'));

    const { items, loading, actionMessage, fetchPatientMedicalHistory } = useMedicalHistory();
    const { fetchPrescription, cancelPrescription, cancellingId } = usePrescriptions();
    const { downloadDocument } = useDocuments();

    const rxDetail = ref<Prescription | null>(null);
    const noteDetail = ref<ClinicalNote | null>(null);
    const cancelTarget = ref<string | null>(null);
    const preview = ref<{ url: string; mimeType: string; filename: string } | null>(null);

    async function load() {
      if (!canRead.value || !props.patientId) return;
      try {
        await fetchPatientMedicalHistory(props.patientId);
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

    async function openPrescription(ev: MedicalHistoryItem) {
      const id = timelineMetaId(ev.metadata, 'prescriptionId');
      if (!id || !canReadRx.value) return;
      try {
        rxDetail.value = await fetchPrescription(id);
      } catch {
        /* actionMessage */
      }
    }

    async function openDocument(ev: MedicalHistoryItem, asDownload = false) {
      const id = timelineMetaId(ev.metadata, 'documentId');
      if (!id || !canReadDocs.value) return;
      try {
        const file = await downloadDocument(props.patientId, id);
        if (asDownload || !canPreviewDocument(file.mimeType)) {
          const url = URL.createObjectURL(file.blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.filename || metaString(ev.metadata, 'filename') || 'document';
          a.click();
          URL.revokeObjectURL(url);
          return;
        }
        if (preview.value) URL.revokeObjectURL(preview.value.url);
        preview.value = {
          url: URL.createObjectURL(file.blob),
          mimeType: file.mimeType,
          filename: file.filename || metaString(ev.metadata, 'filename') || 'document',
        };
      } catch {
        /* actionMessage */
      }
    }

    async function openNote(ev: MedicalHistoryItem) {
      const id = timelineMetaId(ev.metadata, 'noteId');
      if (!id || !canReadNotes.value) return;
      try {
        noteDetail.value = await getPatientClinicalNote(props.patientId, id);
      } catch {
        /* actionMessage */
      }
    }

    async function confirmCancel() {
      if (!cancelTarget.value || !canCancelRx.value) return;
      try {
        await cancelPrescription(cancelTarget.value);
        cancelTarget.value = null;
        rxDetail.value = null;
        await load();
      } catch {
        cancelTarget.value = null;
      }
    }

    function closePreview() {
      if (preview.value) URL.revokeObjectURL(preview.value.url);
      preview.value = null;
    }

    return () => (
      <div class="medical-history-section">
        <Card
          title="Historique médical"
          subtitle="Chronologie des événements cliniques"
          icon="clock"
          padding="md"
        >
          {!canRead.value && (
            <EmptyState
              title="Accès restreint"
              description="Vous n'avez pas l'autorisation de consulter l'historique médical."
              icon="clock"
            />
          )}

          {canRead.value && loading.value && items.value.length === 0 && (
            <LoadingState message="Chargement de l'historique médical…" />
          )}

          {canRead.value && !loading.value && actionMessage.value && items.value.length === 0 && (
            <ErrorState
              title="Impossible de charger l'historique"
              message={actionMessage.value}
              retry={() => void load()}
            />
          )}

          {canRead.value && !loading.value && !actionMessage.value && items.value.length === 0 && (
            <EmptyState
              title="Aucun événement"
              description="Aucun événement n'est encore enregistré sur ce dossier."
              icon="clock"
            />
          )}

          {canRead.value && items.value.length > 0 && (
            <ol class="dossier-timeline">
              {items.value.map((ev) => {
                const tone = timelineTone(ev.eventType);
                const kind = timelineKindBadge(ev.eventType);
                const rxId = timelineMetaId(ev.metadata, 'prescriptionId');
                const docId = timelineMetaId(ev.metadata, 'documentId');
                const noteId = timelineMetaId(ev.metadata, 'noteId');
                const rxActive = metaString(ev.metadata, 'action') !== 'CANCELLED';
                return (
                  <li class={`dossier-timeline__item dossier-timeline__item--${tone}`} key={ev.id}>
                    <div class="dossier-timeline__rail" aria-hidden="true">
                      <span class="dossier-timeline__dot" />
                    </div>
                    <div class="dossier-timeline__body">
                      <div class="dossier-timeline__top">
                        <span class="dossier-timeline__when">{formatMedicalHistoryDate(ev.occurredAt)}</span>
                        <span class={`tl-badge tl-badge--${kind.tone}`}>{kind.label}</span>
                      </div>
                      <p class="dossier-timeline__title">{medicalHistoryEventLabel(ev.eventType)}</p>
                      <p class="dossier-timeline__summary">{eventSummary(ev)}</p>
                      {ev.doctorName ? (
                        <p class="dossier-timeline__doctor">Dr {ev.doctorName}</p>
                      ) : null}
                      {(rxId || docId || noteId) && (
                        <div class="dossier-timeline__actions">
                          {rxId && canReadRx.value && (
                            <Button size="sm" variant="outline" onClick={() => void openPrescription(ev)}>
                              <span class="btn-with-icon">
                                <CmIcon name="eye" size={14} /> Voir
                              </span>
                            </Button>
                          )}
                          {rxId && canCancelRx.value && rxActive && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                cancelTarget.value = rxId;
                              }}
                            >
                              <span class="btn-with-icon">
                                <CmIcon name="trash" size={14} /> Annuler
                              </span>
                            </Button>
                          )}
                          {docId && canReadDocs.value && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => void openDocument(ev)}>
                                <span class="btn-with-icon">
                                  <CmIcon name="eye" size={14} /> Voir
                                </span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                aria-label="Télécharger"
                                onClick={() => void openDocument(ev, true)}
                              >
                                <CmIcon name="download" size={14} /> Télécharger
                              </Button>
                            </>
                          )}
                          {noteId && canReadNotes.value && (
                            <Button size="sm" variant="outline" onClick={() => void openNote(ev)}>
                              <span class="btn-with-icon">
                                <CmIcon name="eye" size={14} /> Voir
                              </span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        <Modal
          open={Boolean(rxDetail.value)}
          title={rxDetail.value ? prescriptionTitle(rxDetail.value) : 'Ordonnance'}
          size="lg"
          onClose={() => {
            rxDetail.value = null;
          }}
        >
          {rxDetail.value && (
            <PrescriptionCard
              prescription={rxDetail.value}
              canCancel={canCancelRx.value}
              cancelling={cancellingId.value === rxDetail.value.id}
              onCancel={() => {
                cancelTarget.value = rxDetail.value!.id;
              }}
            />
          )}
        </Modal>

        <Modal
          open={Boolean(noteDetail.value)}
          title={noteDetail.value?.title || 'Compte rendu'}
          size="lg"
          onClose={() => {
            noteDetail.value = null;
          }}
        >
          {noteDetail.value ? <p class="note-item__body">{noteDetail.value.body}</p> : null}
        </Modal>

        <Modal
          open={Boolean(preview.value)}
          title="Aperçu du document"
          size="lg"
          onClose={closePreview}
        >
          {preview.value?.mimeType === 'application/pdf' ? (
            <iframe class="doc-preview" src={preview.value.url} title={preview.value.filename} />
          ) : preview.value ? (
            <img class="doc-preview-img" src={preview.value.url} alt={preview.value.filename} />
          ) : null}
        </Modal>

        <ConfirmDialog
          open={Boolean(cancelTarget.value)}
          title="Annuler l'ordonnance"
          message="Êtes-vous sûr de vouloir annuler cette ordonnance ?"
          confirmLabel="Annuler l'ordonnance"
          cancelLabel="Fermer"
          danger
          loading={Boolean(cancellingId.value)}
          onConfirm={() => void confirmCancel()}
          onCancel={() => {
            cancelTarget.value = null;
          }}
        />
      </div>
    );
  },
});

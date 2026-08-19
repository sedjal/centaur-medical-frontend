import { defineComponent, onMounted, ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { usePatients } from '../composables/usePatients';
import {
  createEmptyPatientForm,
  emptySpecialty,
  mapSpecialtyFromApi,
  specialtyPayloadForService,
  validatePatientForm,
  patientFormApiMessage,
  type PatientFormFieldErrors,
} from '../utils/patientForm';
import { allowedHospitalServices, serviceLabel } from '../utils/permissions';
import type { PatientFormModel, ServiceType } from '../types';
import {
  PageHeader,
  Card,
  Input,
  Select,
  Button,
  LoadingState,
  ErrorState,
} from '../components/ui';

const STATUS_OPTIONS = [
  { value: 'STABLE', label: 'Stable' },
  { value: 'CRITICAL', label: 'Critique' },
];

export default defineComponent({
  name: 'PatientFormView',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const auth = useAuthStore();
    const {
      loading: loadingPatient,
      fetchPatient,
      createPatient,
      updatePatient,
      clearError,
    } = usePatients();

    const isEdit = computed(() => route.name === 'patient-edit');
    const patientId = computed(() => String(route.params.id || ''));
    const allowedServices = computed(() => allowedHospitalServices(auth.user?.permissions));

    const form = ref<PatientFormModel>(
      createEmptyPatientForm(allowedServices.value[0] || 'GENERAL')
    );
    const patientCode = ref<string | null>(null);
    const fieldErrors = ref<PatientFormFieldErrors>({});
    const formError = ref<string | null>(null);
    const saving = ref(false);
    const loadFailed = ref(false);
    const ready = ref(!isEdit.value);
    const snapshot = ref('');
    let suppressServiceReset = false;

    const serviceOptions = computed(() =>
      allowedServices.value.map((s) => ({ value: s, label: serviceLabel(s) }))
    );

    const pageTitle = computed(() =>
      isEdit.value ? 'Modifier le patient' : 'Nouveau patient'
    );
    const pageDescription = computed(() =>
      isEdit.value
        ? 'Mettez à jour les informations et le dossier médical.'
        : 'Créez un nouveau dossier patient.'
    );
    const backLabel = computed(() =>
      isEdit.value ? '← Retour au dossier' : '← Retour à la liste'
    );
    const isDirty = computed(() => snapshot.value !== '' && JSON.stringify(form.value) !== snapshot.value);

    function takeSnapshot() {
      snapshot.value = JSON.stringify(form.value);
    }

    function clearField(key: string) {
      if (fieldErrors.value[key]) {
        const next = { ...fieldErrors.value };
        delete next[key];
        fieldErrors.value = next;
      }
    }

    async function loadPatient() {
      if (!isEdit.value || !patientId.value) {
        ready.value = true;
        takeSnapshot();
        return;
      }
      loadFailed.value = false;
      formError.value = null;
      clearError();
      try {
        const p = await fetchPatient(patientId.value);
        if (!p) throw new Error('Patient introuvable');
        suppressServiceReset = true;
        patientCode.value = p.patient_code;
        form.value = {
          firstName: p.first_name,
          lastName: p.last_name,
          hospitalizationDate: String(p.hospitalization_date).slice(0, 10),
          service: p.service,
          status: p.status || 'STABLE',
          specialty: mapSpecialtyFromApi(p.service, p.specialty),
        };
        takeSnapshot();
        ready.value = true;
      } catch (err) {
        loadFailed.value = true;
        formError.value = patientFormApiMessage(err, 'load');
      } finally {
        suppressServiceReset = false;
      }
    }

    onMounted(() => {
      void loadPatient();
    });

    watch(
      () => form.value.service,
      (next, prev) => {
        if (suppressServiceReset || !ready.value) return;
        if (next === prev) return;
        form.value.specialty = emptySpecialty();
        fieldErrors.value = {};
      }
    );

    function buildPayload(): PatientFormModel {
      return {
        firstName: form.value.firstName.trim(),
        lastName: form.value.lastName.trim(),
        hospitalizationDate: form.value.hospitalizationDate,
        service: form.value.service,
        status: form.value.status,
        specialty: specialtyPayloadForService(form.value.service, form.value.specialty),
      };
    }

    async function onSubmit(e: Event) {
      e.preventDefault();
      formError.value = null;
      clearError();

      const errors = validatePatientForm(form.value);
      fieldErrors.value = errors;
      if (Object.keys(errors).length > 0) return;

      saving.value = true;
      try {
        const payload = buildPayload();
        if (isEdit.value) {
          await updatePatient(patientId.value, payload);
          takeSnapshot();
          await router.push({ name: 'patient-detail', params: { id: patientId.value } });
        } else {
          const created = await createPatient(payload);
          takeSnapshot();
          const id = created?.id;
          if (id) {
            await router.push({ name: 'patient-detail', params: { id } });
          } else {
            await router.push({ name: 'patients' });
          }
        }
      } catch (err) {
        formError.value = patientFormApiMessage(err, isEdit.value ? 'update' : 'create');
      } finally {
        saving.value = false;
      }
    }

    function onCancel() {
      if (isDirty.value) {
        const ok = window.confirm(
          'Vous avez des modifications non enregistrées. Voulez-vous quitter ?'
        );
        if (!ok) return;
      }
      if (isEdit.value && patientId.value) {
        void router.push({ name: 'patient-detail', params: { id: patientId.value } });
      } else {
        void router.push({ name: 'patients' });
      }
    }

    function onBack() {
      onCancel();
    }

    function specialtySection() {
      const s = form.value.service;
      const sp = form.value.specialty;
      const err = fieldErrors.value;

      if (s === 'URGENCE') {
        return (
          <div class="patient-form__grid">
            <Input
              label="Heure d'arrivée"
              type="time"
              required
              value={sp.arrivalTime || ''}
              error={err.arrivalTime}
              onInput={(v: string) => {
                form.value.specialty.arrivalTime = v;
                clearField('arrivalTime');
              }}
            />
            <Input
              label="Niveau de triage"
              required
              value={sp.triageLevel || ''}
              error={err.triageLevel}
              onInput={(v: string) => {
                form.value.specialty.triageLevel = v;
                clearField('triageLevel');
              }}
            />
            <Input
              label="Sévérité initiale"
              required
              value={sp.initialSeverity || ''}
              error={err.initialSeverity}
              onInput={(v: string) => {
                form.value.specialty.initialSeverity = v;
                clearField('initialSeverity');
              }}
            />
          </div>
        );
      }

      if (s === 'ONCOLOGIE') {
        return (
          <div class="patient-form__grid">
            <Input
              label="Type de tumeur"
              required
              value={sp.tumorType || ''}
              error={err.tumorType}
              onInput={(v: string) => {
                form.value.specialty.tumorType = v;
                clearField('tumorType');
              }}
            />
            <Input
              label="Stade"
              required
              value={sp.stage || ''}
              error={err.stage}
              onInput={(v: string) => {
                form.value.specialty.stage = v;
                clearField('stage');
              }}
            />
            <Input
              label="Traitement actuel"
              required
              value={sp.currentTreatment || ''}
              error={err.currentTreatment}
              onInput={(v: string) => {
                form.value.specialty.currentTreatment = v;
                clearField('currentTreatment');
              }}
            />
          </div>
        );
      }

      if (s === 'CARDIOLOGIE') {
        return (
          <div class="patient-form__grid">
            <Input
              label="Résultats ECG"
              required
              value={sp.ecgResults || ''}
              error={err.ecgResults}
              onInput={(v: string) => {
                form.value.specialty.ecgResults = v;
                clearField('ecgResults');
              }}
            />
            <Input
              label="Fréquence cardiaque"
              type="number"
              required
              value={sp.restingHeartRate != null ? String(sp.restingHeartRate) : ''}
              error={err.restingHeartRate}
              onInput={(v: string) => {
                form.value.specialty.restingHeartRate = v === '' ? undefined : Number(v);
                clearField('restingHeartRate');
              }}
            />
            <Input
              label="Pression artérielle"
              required
              value={sp.bloodPressure || ''}
              error={err.bloodPressure}
              onInput={(v: string) => {
                form.value.specialty.bloodPressure = v;
                clearField('bloodPressure');
              }}
            />
          </div>
        );
      }

      const notesId = 'patient-form-notes';
      return (
        <div class={`cm-field ${err.notes ? 'cm-field--error' : ''}`}>
          <label class="cm-field__label" for={notesId}>
            Notes
          </label>
          <textarea
            id={notesId}
            class="cm-input patient-form__textarea"
            rows={4}
            value={sp.notes || ''}
            onInput={(ev: Event) => {
              form.value.specialty.notes = (ev.target as HTMLTextAreaElement).value;
              clearField('notes');
            }}
          />
          {err.notes && (
            <p class="cm-field__error" role="alert">
              {err.notes}
            </p>
          )}
        </div>
      );
    }

    return () => (
      <div class="page patient-form-page">
        <div class="patient-form__nav">
          <Button variant="ghost" size="sm" type="button" onClick={onBack}>
            {backLabel.value}
          </Button>
        </div>

        <PageHeader title={pageTitle.value} description={pageDescription.value} />

        {isEdit.value && loadingPatient.value && !ready.value && (
          <LoadingState message="Chargement du patient…" />
        )}

        {loadFailed.value && (
          <ErrorState
            title="Impossible de charger le patient"
            message={formError.value || 'Patient introuvable.'}
            retry={() => void loadPatient()}
          />
        )}

        {ready.value && !loadFailed.value && (
          <form class="patient-form" onSubmit={onSubmit} noValidate>
            {formError.value && (
              <ErrorState title="Erreur" message={formError.value} />
            )}

            <Card title="Informations patient" padding="md">
              <div class="patient-form__grid">
                <Input
                  label="Code patient"
                  value={
                    isEdit.value
                      ? patientCode.value || ''
                      : 'Généré automatiquement'
                  }
                  disabled
                  hint={
                    isEdit.value
                      ? undefined
                      : 'Attribué automatiquement à la création.'
                  }
                />
                <Input
                  label="Nom"
                  required
                  value={form.value.lastName}
                  error={fieldErrors.value.lastName}
                  onInput={(v: string) => {
                    form.value.lastName = v;
                    clearField('lastName');
                  }}
                />
                <Input
                  label="Prénom"
                  required
                  value={form.value.firstName}
                  error={fieldErrors.value.firstName}
                  onInput={(v: string) => {
                    form.value.firstName = v;
                    clearField('firstName');
                  }}
                />
              </div>
            </Card>

            <Card title="Hospitalisation" padding="md">
              <div class="patient-form__grid">
                <Select
                  label="Service"
                  required
                  value={form.value.service}
                  options={serviceOptions.value}
                  error={fieldErrors.value.service}
                  onChange={(v: string) => {
                    form.value.service = v as ServiceType;
                    clearField('service');
                  }}
                />
                <Select
                  label="Statut"
                  required
                  value={form.value.status}
                  options={STATUS_OPTIONS}
                  error={fieldErrors.value.status}
                  onChange={(v: string) => {
                    form.value.status = v;
                    clearField('status');
                  }}
                />
                <Input
                  label="Date d'hospitalisation"
                  type="date"
                  required
                  value={form.value.hospitalizationDate}
                  error={fieldErrors.value.hospitalizationDate}
                  onInput={(v: string) => {
                    form.value.hospitalizationDate = v;
                    clearField('hospitalizationDate');
                  }}
                />
              </div>
            </Card>

            <Card title="Données médicales" padding="md">
              {specialtySection()}
            </Card>

            <div class="patient-form__actions">
              <Button variant="ghost" type="button" disabled={saving.value} onClick={onCancel}>
                Annuler
              </Button>
              <Button type="submit" loading={saving.value} disabled={saving.value}>
                Enregistrer
              </Button>
            </div>
          </form>
        )}
      </div>
    );
  },
});

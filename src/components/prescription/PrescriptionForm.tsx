import { defineComponent, ref, watch, type PropType } from 'vue';
import type { PrescriptionCreatePayload, PrescriptionMedicationInput, Patient } from '../../types';
import { useAuthStore } from '../../stores/auth';
import {
  emptyMedication,
  toDatetimeLocalValue,
  validatePrescriptionForm,
  buildCreatePayload,
  serializePrescriptionNotes,
  type PrescriptionFormFieldErrors,
} from '../../utils/prescriptions';
import { Input, Button } from '../ui';

function calcAge(patient: Patient): string {
  const dob = (patient as unknown as Record<string, unknown>)['date_of_birth'] as string | undefined;
  if (!dob) return '';
  const diff = Date.now() - new Date(dob).getTime();
  return `${Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))} ans`;
}

function genderLabel(patient: Patient): string {
  const g = (patient as unknown as Record<string, unknown>)['gender'] as string | undefined;
  if (!g) return '';
  return g === 'F' || g === 'FEMME' ? 'Femme' : 'Homme';
}

export default defineComponent({
  name: 'PrescriptionForm',
  props: {
    patientId: { type: String, required: true },
    patient: { type: Object as PropType<Patient | null>, default: null },
    saving: { type: Boolean, default: false },
    error: { type: String, default: undefined },
    onSubmit: {
      type: Function as PropType<(payload: PrescriptionCreatePayload) => void>,
      required: true,
    },
    onCancel: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    const auth = useAuthStore();

    const prescribedAt = ref(toDatetimeLocalValue());
    const notes = ref('');
    const medications = ref<PrescriptionMedicationInput[]>([emptyMedication()]);
    const fieldErrors = ref<PrescriptionFormFieldErrors>({});

    const customDoctor = ref('');
    const customAge = ref('');
    const customGender = ref('Femme');

    watch(
      () => props.patient,
      (newPatient) => {
        if (newPatient) {
          customAge.value = calcAge(newPatient);
          customGender.value = genderLabel(newPatient) || 'Femme';
        }
      },
      { immediate: true }
    );

    watch(
      () => auth.fullName,
      (newName) => {
        if (newName) {
          customDoctor.value = newName;
        }
      },
      { immediate: true }
    );

    function clearField(key: string) {
      if (!fieldErrors.value[key]) return;
      const next = { ...fieldErrors.value };
      delete next[key];
      fieldErrors.value = next;
    }

    function addMedication() {
      medications.value = [...medications.value, emptyMedication()];
    }

    function removeMedication(index: number) {
      if (medications.value.length <= 1) return;
      medications.value = medications.value.filter((_, i) => i !== index);
      fieldErrors.value = {};
    }

    function updateMed(index: number, key: keyof PrescriptionMedicationInput, value: string) {
      const next = [...medications.value];
      next[index] = { ...next[index], [key]: value };
      medications.value = next;
      clearField(`med-${index}-${key}`);
    }

    function submit(e: Event) {
      e.preventDefault();
      const serializedNotes = serializePrescriptionNotes({
        userNotes: notes.value,
        customAge: customAge.value.trim() || undefined,
        customGender: customGender.value.trim() || undefined,
        customDoctor: customDoctor.value.trim() || undefined,
      });

      const payload = buildCreatePayload(
        props.patientId,
        prescribedAt.value,
        serializedNotes,
        medications.value
      );
      const errors = validatePrescriptionForm(payload);
      fieldErrors.value = errors;
      if (Object.keys(errors).length > 0) return;
      if ('doctorId' in payload) {
        delete (payload as { doctorId?: unknown }).doctorId;
      }
      props.onSubmit(payload);
    }

    return () => (
      <form class="rx-form" onSubmit={submit} noValidate>
        {props.error && (
          <p class="cm-field__error" role="alert">
            {props.error}
          </p>
        )}

        <div class="rx-form__grid" style={{ marginBottom: '16px' }}>
          <Input
            label="Date de prescription"
            type="datetime-local"
            required
            value={prescribedAt.value}
            error={fieldErrors.value.prescribedAt}
            onInput={(v: string) => {
              prescribedAt.value = v;
              clearField('prescribedAt');
            }}
          />
          <Input
            label="Médecin prescripteur"
            required
            value={customDoctor.value}
            onInput={(v: string) => {
              customDoctor.value = v;
            }}
          />
        </div>

        <div class="rx-form__grid" style={{ marginBottom: '16px' }}>
          <Input
            label="Âge du patient (à afficher)"
            required
            value={customAge.value}
            onInput={(v: string) => {
              customAge.value = v;
            }}
          />
          <div class="cm-field">
            <label class="cm-field__label">Sexe du patient (à afficher) *</label>
            <select
              class="cm-input"
              value={customGender.value}
              onChange={(ev: Event) => {
                customGender.value = (ev.target as HTMLSelectElement).value;
              }}
            >
              <option value="Femme">Femme</option>
              <option value="Homme">Homme</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
        </div>

        <div class="rx-form__meds">
          <h3 class="rx-form__subtitle">Médicaments</h3>
          {fieldErrors.value.medications && (
            <p class="cm-field__error" role="alert">
              {fieldErrors.value.medications}
            </p>
          )}

          {medications.value.map((med, index) => (
            <div class="rx-form__med" key={`med-${index}`}>
              <Input
                label="Médicament"
                required
                value={med.name}
                error={fieldErrors.value[`med-${index}-name`]}
                onInput={(v: string) => updateMed(index, 'name', v)}
              />
              <div class="rx-form__grid">
                <Input
                  label="Dosage"
                  required
                  value={med.dosage}
                  error={fieldErrors.value[`med-${index}-dosage`]}
                  onInput={(v: string) => updateMed(index, 'dosage', v)}
                />
                <Input
                  label="Fréquence"
                  required
                  value={med.frequency}
                  error={fieldErrors.value[`med-${index}-frequency`]}
                  onInput={(v: string) => updateMed(index, 'frequency', v)}
                />
                <Input
                  label="Durée"
                  required
                  value={med.duration}
                  error={fieldErrors.value[`med-${index}-duration`]}
                  onInput={(v: string) => updateMed(index, 'duration', v)}
                />
              </div>
              <Input
                label="Instructions"
                value={med.instructions || ''}
                onInput={(v: string) => updateMed(index, 'instructions', v)}
              />
              {medications.value.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => removeMedication(index)}
                >
                  Supprimer
                </Button>
              )}
            </div>
          ))}

          <Button variant="outline" type="button" onClick={addMedication}>
            + Ajouter un médicament
          </Button>
        </div>

        <div class={`cm-field`}>
          <label class="cm-field__label" for="rx-notes">
            Notes
          </label>
          <textarea
            id="rx-notes"
            class="cm-input patient-form__textarea"
            rows={3}
            value={notes.value}
            onInput={(ev: Event) => {
              notes.value = (ev.target as HTMLTextAreaElement).value;
            }}
          />
        </div>

        <div class="rx-form__actions">
          <Button
            variant="ghost"
            type="button"
            disabled={props.saving}
            onClick={() => props.onCancel()}
          >
            Annuler
          </Button>
          <Button type="submit" loading={props.saving} disabled={props.saving}>
            Créer l'ordonnance
          </Button>
        </div>
      </form>
    );
  },
});

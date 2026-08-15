import { defineComponent, ref, type PropType } from 'vue';
import type { PrescriptionCreatePayload, PrescriptionMedicationInput } from '../../types';
import {
  emptyMedication,
  toDatetimeLocalValue,
  validatePrescriptionForm,
  buildCreatePayload,
  type PrescriptionFormFieldErrors,
} from '../../utils/prescriptions';
import { Input, Button } from '../ui';

export default defineComponent({
  name: 'PrescriptionForm',
  props: {
    patientId: { type: String, required: true },
    saving: { type: Boolean, default: false },
    error: { type: String, default: undefined },
    onSubmit: {
      type: Function as PropType<(payload: PrescriptionCreatePayload) => void>,
      required: true,
    },
    onCancel: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    const prescribedAt = ref(toDatetimeLocalValue());
    const notes = ref('');
    const medications = ref<PrescriptionMedicationInput[]>([emptyMedication()]);
    const fieldErrors = ref<PrescriptionFormFieldErrors>({});

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
      const payload = buildCreatePayload(
        props.patientId,
        prescribedAt.value,
        notes.value,
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

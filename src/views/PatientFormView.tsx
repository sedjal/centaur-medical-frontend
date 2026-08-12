import { defineComponent, onMounted, ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createPatient, getPatient, updatePatient } from '../services/patients';
import { emptySpecialty, mapSpecialtyFromApi, validateSpecialty } from '../utils/patientForm';
import type { PatientFormModel, ServiceType } from '../types';

export default defineComponent({
  name: 'PatientFormView',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const isEdit = computed(() => Boolean(route.params.id));
    const error = ref<string | null>(null);
    const saving = ref(false);

    const form = ref<PatientFormModel>({
      firstName: '',
      lastName: '',
      hospitalizationDate: new Date().toISOString().slice(0, 10),
      service: 'GENERAL',
      status: 'STABLE',
      specialty: emptySpecialty(),
    });

    onMounted(async () => {
      if (!isEdit.value) return;
      try {
        const p = await getPatient(String(route.params.id));
        form.value = {
          firstName: p.first_name,
          lastName: p.last_name,
          hospitalizationDate: String(p.hospitalization_date).slice(0, 10),
          service: p.service,
          status: p.status,
          specialty: mapSpecialtyFromApi(p.service, p.specialty),
        };
      } catch (e: unknown) {
        error.value =
          (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to load patient';
      }
    });

    watch(
      () => form.value.service,
      () => {
        // keep dynamic fields; reset specialty when service changes in create mode
        if (!isEdit.value) form.value.specialty = emptySpecialty();
      }
    );

    async function onSubmit(e: Event) {
      e.preventDefault();
      saving.value = true;
      error.value = null;
      try {
        const payload = { ...form.value, specialty: { ...form.value.specialty } };
        if (payload.specialty.restingHeartRate != null) {
          payload.specialty.restingHeartRate = Number(payload.specialty.restingHeartRate);
        }
        const invalid = validateSpecialty(payload.service, payload.specialty);
        if (invalid) {
          error.value = invalid;
          return;
        }
        if (isEdit.value) {
          await updatePatient(String(route.params.id), payload);
        } else {
          await createPatient(payload);
        }
        await router.push({ name: 'patients' });
      } catch (err: unknown) {
        error.value =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Save failed';
      } finally {
        saving.value = false;
      }
    }

    function specialtyFields() {
      const s = form.value.service;
      const sp = form.value.specialty;
      if (s === 'URGENCE') {
        return (
          <div class="grid-2">
            <div class="field">
              <label>Arrival time</label>
              <input
                class="input"
                type="time"
                value={sp.arrivalTime || ''}
                onInput={(ev: Event) => {
                  form.value.specialty.arrivalTime = (ev.target as HTMLInputElement).value;
                }}
                required
              />
            </div>
            <div class="field">
              <label>Triage level</label>
              <input
                class="input"
                value={sp.triageLevel || ''}
                onInput={(ev: Event) => {
                  form.value.specialty.triageLevel = (ev.target as HTMLInputElement).value;
                }}
                required
              />
            </div>
            <div class="field">
              <label>Initial severity</label>
              <input
                class="input"
                value={sp.initialSeverity || ''}
                onInput={(ev: Event) => {
                  form.value.specialty.initialSeverity = (ev.target as HTMLInputElement).value;
                }}
                required
              />
            </div>
          </div>
        );
      }
      if (s === 'ONCOLOGIE') {
        return (
          <div class="grid-2">
            <div class="field">
              <label>Tumor type</label>
              <input
                class="input"
                value={sp.tumorType || ''}
                onInput={(ev: Event) => {
                  form.value.specialty.tumorType = (ev.target as HTMLInputElement).value;
                }}
                required
              />
            </div>
            <div class="field">
              <label>Stage</label>
              <input
                class="input"
                value={sp.stage || ''}
                onInput={(ev: Event) => {
                  form.value.specialty.stage = (ev.target as HTMLInputElement).value;
                }}
                required
              />
            </div>
            <div class="field">
              <label>Current treatment</label>
              <input
                class="input"
                value={sp.currentTreatment || ''}
                onInput={(ev: Event) => {
                  form.value.specialty.currentTreatment = (ev.target as HTMLInputElement).value;
                }}
                required
              />
            </div>
          </div>
        );
      }
      if (s === 'CARDIOLOGIE') {
        return (
          <div class="grid-2">
            <div class="field">
              <label>ECG results</label>
              <input
                class="input"
                value={sp.ecgResults || ''}
                onInput={(ev: Event) => {
                  form.value.specialty.ecgResults = (ev.target as HTMLInputElement).value;
                }}
                required
              />
            </div>
            <div class="field">
              <label>Resting heart rate</label>
              <input
                class="input"
                type="number"
                value={sp.restingHeartRate ?? ''}
                onInput={(ev: Event) => {
                  form.value.specialty.restingHeartRate = Number(
                    (ev.target as HTMLInputElement).value
                  );
                }}
                required
              />
            </div>
            <div class="field">
              <label>Blood pressure</label>
              <input
                class="input"
                value={sp.bloodPressure || ''}
                onInput={(ev: Event) => {
                  form.value.specialty.bloodPressure = (ev.target as HTMLInputElement).value;
                }}
                required
              />
            </div>
          </div>
        );
      }
      return (
        <div class="field">
          <label>Notes</label>
          <textarea
            class="input"
            rows={4}
            value={sp.notes || ''}
            onInput={(ev: Event) => {
              form.value.specialty.notes = (ev.target as HTMLTextAreaElement).value;
            }}
          />
        </div>
      );
    }

    return () => (
      <div class="page">
        <div class="page-header">
          <div>
            <h1>{isEdit.value ? 'Edit patient' : 'New patient'}</h1>
            <p>Dynamic form based on hospital service.</p>
          </div>
        </div>

        {error.value && <div class="alert alert-error">{error.value}</div>}

        <form class="card" style="padding:24px;max-width:860px" onSubmit={onSubmit}>
          <div class="field">
            <label>Service</label>
            <select
              class="select"
              value={form.value.service}
              onChange={(ev: Event) => {
                form.value.service = (ev.target as HTMLSelectElement).value as ServiceType;
              }}
            >
              <option value="GENERAL">Chirurgie Générale</option>
              <option value="URGENCE">Urgence</option>
              <option value="ONCOLOGIE">Oncologie</option>
              <option value="CARDIOLOGIE">Cardiologie</option>
            </select>
          </div>

          <div class="grid-2">
            <div class="field">
              <label>First name</label>
              <input
                class="input"
                value={form.value.firstName}
                onInput={(ev: Event) => {
                  form.value.firstName = (ev.target as HTMLInputElement).value;
                }}
                required
              />
            </div>
            <div class="field">
              <label>Last name</label>
              <input
                class="input"
                value={form.value.lastName}
                onInput={(ev: Event) => {
                  form.value.lastName = (ev.target as HTMLInputElement).value;
                }}
                required
              />
            </div>
          </div>

          <div class="grid-2">
            <div class="field">
              <label>Hospitalization date</label>
              <input
                class="input"
                type="date"
                value={form.value.hospitalizationDate}
                onInput={(ev: Event) => {
                  form.value.hospitalizationDate = (ev.target as HTMLInputElement).value;
                }}
                required
              />
            </div>
            <div class="field">
              <label>Status</label>
              <select
                class="select"
                value={form.value.status}
                onChange={(ev: Event) => {
                  form.value.status = (ev.target as HTMLSelectElement).value;
                }}
              >
                <option value="STABLE">Stable</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <h3 style="margin:8px 0 16px;font-size:16px">Service-specific data</h3>
          {specialtyFields()}

          <div style="display:flex;gap:12px;margin-top:8px">
            <button class="btn btn-primary" type="submit" disabled={saving.value}>
              {saving.value ? 'Saving…' : 'Save patient'}
            </button>
            <button class="btn btn-ghost" type="button" onClick={() => router.push({ name: 'patients' })}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  },
});

import { defineComponent, type PropType } from 'vue';
import type { Patient, ServiceType, SpecialtyData } from '../../types';
import { mapSpecialtyFromApi, normalizeTimeForInput } from '../../utils/patientForm';
import { serviceLabel } from '../../utils/permissions';
import { Card, EmptyState } from '../ui';
import { CmIcon } from '../ui/icons';

function display(value: string | number | null | undefined): string {
  if (value == null || value === '') return 'N/A';
  return String(value);
}

function fieldsForService(service: ServiceType, sp: SpecialtyData) {
  if (service === 'URGENCE') {
    return [
      { label: "Heure d'arrivée", value: display(normalizeTimeForInput(sp.arrivalTime)) },
      { label: 'Niveau de triage', value: display(sp.triageLevel) },
      { label: 'Sévérité initiale', value: display(sp.initialSeverity) },
    ];
  }
  if (service === 'ONCOLOGIE') {
    return [
      { label: 'Type de tumeur', value: display(sp.tumorType) },
      { label: 'Stade', value: display(sp.stage) },
      { label: 'Traitement actuel', value: display(sp.currentTreatment) },
    ];
  }
  if (service === 'CARDIOLOGIE') {
    return [
      { label: 'Résultats ECG', value: display(sp.ecgResults) },
      {
        label: 'Fréquence cardiaque au repos',
        value: sp.restingHeartRate != null ? `${sp.restingHeartRate} bpm` : 'N/A',
      },
      { label: 'Pression artérielle', value: display(sp.bloodPressure) },
    ];
  }
  return [{ label: 'Notes', value: display(sp.notes) }];
}

export default defineComponent({
  name: 'MedicalRecordCard',
  props: {
    patient: { type: Object as PropType<Patient>, required: true },
  },
  setup(props) {
    return () => {
      const p = props.patient;
      const specialty = mapSpecialtyFromApi(p.service, p.specialty);
      const fields = fieldsForService(p.service, specialty);
      const hasAny = fields.some((f) => f.value !== 'N/A');

      return (
        <Card title="Dossier médical" icon="folder" padding="md">
          <p class="medical-record__service">
            <span>Service :</span> {serviceLabel(p.service)}
          </p>
          {!hasAny ? (
            <EmptyState
              title="Aucune donnée spécialisée"
              description="Le dossier spécialisé ne contient pas encore d'informations renseignées."
              icon="folder"
            />
          ) : (
            <div class="medical-fields">
              {fields.map((f) => (
                <div class="medical-field" key={f.label}>
                  <div class="medical-field__label">{f.label === 'Notes' ? 'Notes médicales' : f.label}</div>
                  <div class="medical-field__value">{f.value}</div>
                </div>
              ))}
            </div>
          )}
          <p class="medical-record__secure">
            <CmIcon name="shield" size={16} />
            Les notes sont sécurisées et accessibles uniquement aux professionnels autorisés.
          </p>
        </Card>
      );
    };
  },
});

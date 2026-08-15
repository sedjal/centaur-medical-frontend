import { defineComponent, type PropType } from 'vue';
import type { Patient } from '../../types';
import { serviceLabel, formatDate } from '../../utils/permissions';
import { Card, Badge, type BadgeVariant } from '../ui';

function statusBadgeVariant(status: string): BadgeVariant {
  return String(status).toUpperCase() === 'CRITICAL' ? 'danger' : 'success';
}

function statusLabel(status: string): string {
  const s = String(status || '').toUpperCase();
  if (s === 'CRITICAL') return 'Critique';
  if (s === 'STABLE') return 'Stable';
  return status || 'N/A';
}

function Field(props: { label: string; value: string }) {
  return (
    <div class="patient-info-field">
      <dt>{props.label}</dt>
      <dd>{props.value || 'N/A'}</dd>
    </div>
  );
}

export default defineComponent({
  name: 'PatientInfoCard',
  props: {
    patient: { type: Object as PropType<Patient>, required: true },
  },
  setup(props) {
    return () => {
      const p = props.patient;
      return (
        <Card title="Informations du patient" padding="md">
          <dl class="patient-info-grid">
            <Field label="Code patient" value={p.patient_code} />
            <Field label="Nom" value={String(p.last_name || '').toUpperCase()} />
            <Field label="Prénom" value={p.first_name} />
            <div class="patient-info-field">
              <dt>Service</dt>
              <dd>
                <Badge variant="info">{serviceLabel(p.service)}</Badge>
              </dd>
            </div>
            <div class="patient-info-field">
              <dt>Statut</dt>
              <dd>
                <Badge variant={statusBadgeVariant(p.status)}>{statusLabel(p.status)}</Badge>
              </dd>
            </div>
            <Field label="Date d'hospitalisation" value={formatDate(String(p.hospitalization_date))} />
          </dl>
        </Card>
      );
    };
  },
});

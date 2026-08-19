import { defineComponent, type PropType } from 'vue';
import type { Patient } from '../../types';
import { serviceLabel, initials, formatDate } from '../../utils/permissions';
import { Badge, Button, type BadgeVariant } from '../ui';
import { CmIcon } from '../ui/icons';

function serviceBadgeVariant(service: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    URGENCE: 'danger',
    ONCOLOGIE: 'warning',
    CARDIOLOGIE: 'info',
    GENERAL: 'info',
  };
  return map[service] || 'default';
}

function statusBadgeVariant(status: string): BadgeVariant {
  return String(status).toUpperCase() === 'CRITICAL' ? 'danger' : 'success';
}

function statusLabel(status: string): string {
  const s = String(status || '').toUpperCase();
  if (s === 'CRITICAL') return 'Critique';
  if (s === 'STABLE') return 'Stable';
  return status || 'N/A';
}

export default defineComponent({
  name: 'PatientHeader',
  props: {
    patient: { type: Object as PropType<Patient>, required: true },
    canUpdate: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
    onEdit: { type: Function as PropType<() => void>, default: undefined },
    onDelete: { type: Function as PropType<() => void>, default: undefined },
    onBack: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props) {
    return () => {
      const p = props.patient;
      const displayName = `${String(p.last_name || '').toUpperCase()} ${p.first_name || ''}`.trim();

      return (
        <div class="patient-header">
          {props.onBack && (
            <button type="button" class="patient-header__back" onClick={() => props.onBack?.()}>
              ← Retour aux patients
            </button>
          )}

          <div class="patient-header__main">
            <div class="patient-header__identity">
              <div class="patient-header__avatar" aria-hidden="true">
                {initials(p.first_name, p.last_name)}
              </div>
              <div>
                <h1 class="patient-header__name">{displayName}</h1>
                <p class="patient-header__code">{p.patient_code || 'N/A'}</p>
                <div class="patient-header__meta">
                  <Badge variant={serviceBadgeVariant(p.service)}>{serviceLabel(p.service)}</Badge>
                  <Badge variant={statusBadgeVariant(p.status)}>
                    {String(p.status).toUpperCase() !== 'CRITICAL' ? (
                      <CmIcon name="check" size={12} />
                    ) : null}
                    {statusLabel(p.status)}
                  </Badge>
                </div>
              </div>
            </div>

            <div class="patient-header__aside">
              <p class="patient-header__date">
                <CmIcon name="calendar" size={16} />
                Hospitalisé depuis {formatDate(p.hospitalization_date)}
              </p>
              {(props.canUpdate || props.canDelete) && (
                <div class="patient-header__actions">
                  {props.canUpdate && (
                    <Button variant="primary" onClick={() => props.onEdit?.()}>
                      <span class="btn-with-icon">
                        <CmIcon name="pencil" size={16} /> Modifier
                      </span>
                    </Button>
                  )}
                  {props.canDelete && (
                    <Button variant="danger" onClick={() => props.onDelete?.()}>
                      Supprimer
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    };
  },
});

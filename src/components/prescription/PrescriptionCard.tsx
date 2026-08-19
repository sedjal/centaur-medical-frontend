import { defineComponent, type PropType } from 'vue';
import type { Prescription } from '../../types';
import { formatPrescriptionDate } from '../../utils/prescriptions';
import { Badge, Button, type BadgeVariant } from '../ui';
import { CmIcon } from '../ui/icons';

function statusVariant(status: string): BadgeVariant {
  return status === 'ACTIVE' ? 'success' : 'warning';
}

function statusLabel(status: string): string {
  return status === 'CANCELLED' ? 'Annulée' : 'Active';
}

export default defineComponent({
  name: 'PrescriptionCard',
  props: {
    prescription: { type: Object as PropType<Prescription>, required: true },
    canCancel: { type: Boolean, default: false },
    cancelling: { type: Boolean, default: false },
    onCancel: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props) {
    return () => {
      const rx = props.prescription;
      const meds = (rx.medications || []).filter((m) => m && m.name);
      if (!meds.length) return null;

      return (
        <div class="rx-card">
          <div class="rx-card__head">
            <div class="rx-meta-bar">
              <span class="rx-meta-bar__item">
                <CmIcon name="calendar" size={16} />
                {formatPrescriptionDate(rx.prescribedAt)}
              </span>
              <span class="rx-meta-bar__item">
                <CmIcon name="user" size={16} />
                {rx.doctorName ? `Dr ${rx.doctorName}` : 'Médecin non renseigné'}
              </span>
              <span class="rx-meta-bar__item">
                <Badge variant={statusVariant(rx.status)}>
                  {rx.status === 'ACTIVE' ? <span class="cm-badge__dot" /> : null}
                  {statusLabel(rx.status)}
                </Badge>
              </span>
              <span class="rx-meta-bar__item">
                <CmIcon name="pill" size={16} />
                {meds.length} médicament{meds.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <h3 class="rx-card__section">Médicaments prescrits</h3>
          <div class="rx-meds-wrap">
            <table class="cm-data-table__table rx-meds-table">
              <thead>
                <tr>
                  <th>Médicament</th>
                  <th>Dosage</th>
                  <th>Fréquence</th>
                  <th>Durée</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {meds.map((m) => (
                  <tr key={m.id || `${m.name}-${m.dosage}`}>
                    <td>
                      <strong>{m.name}</strong>
                    </td>
                    <td>{m.dosage || '—'}</td>
                    <td>{m.frequency || '—'}</td>
                    <td>{m.duration || '—'}</td>
                    <td>{m.instructions || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rx.notes ? (
            <p class="rx-card__notes">
              <em>Observations</em> {rx.notes}
            </p>
          ) : null}

          {props.canCancel && rx.status === 'ACTIVE' && (
            <div class="rx-card__actions">
              <Button
                variant="danger"
                size="sm"
                loading={props.cancelling}
                disabled={props.cancelling}
                onClick={() => props.onCancel?.()}
              >
                <span class="btn-with-icon">
                  <CmIcon name="trash" size={14} /> Annuler l'ordonnance
                </span>
              </Button>
            </div>
          )}
        </div>
      );
    };
  },
});

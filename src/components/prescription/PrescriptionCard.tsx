import { defineComponent, type PropType } from 'vue';
import type { Prescription } from '../../types';
import { formatPrescriptionDate } from '../../utils/prescriptions';
import { Badge, Card, Button, type BadgeVariant } from '../ui';

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
        <Card padding="md">
          <div class="rx-card">
            <div class="rx-card__head">
              <div>
                <div class="rx-card__date">{formatPrescriptionDate(rx.prescribedAt)}</div>
                <div class="rx-card__doctor">
                  {rx.doctorName ? `Dr ${rx.doctorName}` : 'Médecin non renseigné'}
                </div>
              </div>
              <div class="rx-card__meta">
                <Badge variant={statusVariant(rx.status)}>{statusLabel(rx.status)}</Badge>
                <span class="rx-card__count">
                  {meds.length} médicament{meds.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <ul class="rx-meds">
              {meds.map((m) => (
                <li key={m.id || `${m.name}-${m.dosage}`} class="rx-med">
                  <strong class="rx-med__name">{m.name}</strong>
                  <div class="rx-med__grid">
                    <span>
                      <em>Dosage</em> {m.dosage}
                    </span>
                    <span>
                      <em>Fréquence</em> {m.frequency}
                    </span>
                    <span>
                      <em>Durée</em> {m.duration}
                    </span>
                  </div>
                  {m.instructions ? (
                    <p class="rx-med__instructions">{m.instructions}</p>
                  ) : null}
                </li>
              ))}
            </ul>

            {rx.notes ? (
              <p class="rx-card__notes">
                <em>Notes</em> {rx.notes}
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
                  Annuler l'ordonnance
                </Button>
              </div>
            )}
          </div>
        </Card>
      );
    };
  },
});

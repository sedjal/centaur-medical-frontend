import { defineComponent, type PropType } from 'vue';
import type { MedicalHistoryItem } from '../../types';
import {
  formatMedicalHistoryDate,
  medicalHistoryEventLabel,
  medicalHistoryEventVariant,
  medicalHistoryMetadataLabel,
} from '../../utils/medicalHistory';
import { serviceLabel } from '../../utils/permissions';
import { Badge, Card } from '../ui';

export default defineComponent({
  name: 'HistoryEventCard',
  props: {
    event: { type: Object as PropType<MedicalHistoryItem>, required: true },
  },
  setup(props) {
    return () => {
      const ev = props.event;
      const meta = medicalHistoryMetadataLabel(ev.metadata);

      return (
        <Card padding="md">
          <div class="mh-card">
            <div class="mh-card__head">
              <div>
                <div class="mh-card__date">{formatMedicalHistoryDate(ev.occurredAt)}</div>
                <div class="mh-card__summary">{ev.summary}</div>
                <div class="mh-card__doctor">
                  {ev.doctorName ? `Dr ${ev.doctorName}` : 'Médecin non renseigné'}
                </div>
              </div>
              <div class="mh-card__meta">
                <Badge variant={medicalHistoryEventVariant(ev.eventType)}>
                  {medicalHistoryEventLabel(ev.eventType)}
                </Badge>
                <span class="mh-card__service">{serviceLabel(ev.service)}</span>
              </div>
            </div>
            {meta ? <p class="mh-card__ref">{meta}</p> : null}
          </div>
        </Card>
      );
    };
  },
});

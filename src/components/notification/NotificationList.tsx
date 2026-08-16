import { defineComponent, type PropType } from 'vue';
import type { AppNotification } from '../../types';
import { EmptyState, LoadingState } from '../ui';
import NotificationCard from './NotificationCard';

export default defineComponent({
  name: 'NotificationList',
  props: {
    items: { type: Array as PropType<AppNotification[]>, required: true },
    loading: { type: Boolean, default: false },
    patientLabel: {
      type: Function as PropType<(patientId: string) => string>,
      default: undefined,
    },
    recipientLabel: {
      type: Function as PropType<(recipientId: string) => string>,
      default: undefined,
    },
    canMarkRead: { type: Boolean, default: false },
    canCancel: { type: Boolean, default: false },
    actingId: { type: String as PropType<string | null>, default: null },
    onMarkRead: { type: Function as PropType<(id: string) => void>, default: undefined },
    onCancel: { type: Function as PropType<(n: AppNotification) => void>, default: undefined },
    onOpen: { type: Function as PropType<(n: AppNotification) => void>, default: undefined },
  },
  setup(props) {
    return () => {
      if (props.loading && props.items.length === 0) {
        return <LoadingState message="Chargement des notifications…" />;
      }

      if (!props.loading && props.items.length === 0) {
        return (
          <EmptyState
            title="Aucune notification"
            description="Aucune notification ne correspond à ces filtres."
          />
        );
      }

      return (
        <div class="notif-inbox">
          {props.items.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              patientLabel={
                n.patientId && props.patientLabel ? props.patientLabel(n.patientId) : undefined
              }
              recipientLabel={
                props.recipientLabel ? props.recipientLabel(n.recipientId) : undefined
              }
              canMarkRead={props.canMarkRead}
              canCancel={props.canCancel}
              acting={props.actingId === n.id}
              onMarkRead={() => props.onMarkRead?.(n.id)}
              onCancel={() => props.onCancel?.(n)}
              onOpen={() => props.onOpen?.(n)}
            />
          ))}
        </div>
      );
    };
  },
});

import { defineComponent, type PropType } from 'vue';
import type { AppNotification } from '../../types';
import {
  formatRelativeNotificationTime,
  isNotificationUnread,
  notificationStatusLabel,
  notificationTypeLabel,
} from '../../utils/notifications';
import { Button } from '../ui';

export default defineComponent({
  name: 'NotificationCard',
  props: {
    notification: { type: Object as PropType<AppNotification>, required: true },
    patientLabel: { type: String, default: undefined },
    recipientLabel: { type: String, default: undefined },
    canMarkRead: { type: Boolean, default: false },
    canCancel: { type: Boolean, default: false },
    acting: { type: Boolean, default: false },
    showOpen: { type: Boolean, default: true },
    onMarkRead: { type: Function as PropType<() => void>, default: undefined },
    onCancel: { type: Function as PropType<() => void>, default: undefined },
    onOpen: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props) {
    return () => {
      const n = props.notification;
      const unread = isNotificationUnread(n.status);
      const when = n.status === 'PENDING' ? n.scheduledAt : n.sentAt || n.scheduledAt || n.createdAt;

      function open() {
        props.onOpen?.();
      }

      return (
        <article
          class={[
            'notif-item',
            unread ? 'notif-item--unread' : '',
            n.status === 'CANCELLED' ? 'notif-item--cancelled' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          role="button"
          tabindex="0"
          onClick={() => open()}
          onKeydown={(ev: KeyboardEvent) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              open();
            }
          }}
        >
          <span
            class={unread ? 'notif-item__dot' : 'notif-item__dot notif-item__dot--off'}
            aria-hidden="true"
          />
          <div class="notif-item__body">
            <div class="notif-item__top">
              <strong class="notif-item__title">{n.title}</strong>
              <time class="notif-item__time">{formatRelativeNotificationTime(when)}</time>
            </div>
            <p class="notif-item__preview">{n.message}</p>
            <div class="notif-item__meta">
              <span>{notificationTypeLabel(n.type)}</span>
              {(n.status === 'PENDING' || n.status === 'CANCELLED') && (
                <span>{notificationStatusLabel(n.status)}</span>
              )}
              {props.recipientLabel && <span>À {props.recipientLabel}</span>}
              {props.patientLabel && <span>{props.patientLabel}</span>}
            </div>
          </div>
          <div
            class="notif-item__actions"
            onClick={(ev: MouseEvent) => ev.stopPropagation()}
            onKeydown={(ev: KeyboardEvent) => ev.stopPropagation()}
          >
            {props.canMarkRead && n.status === 'SENT' && (
              <Button
                variant="ghost"
                size="sm"
                loading={props.acting}
                disabled={props.acting}
                onClick={() => props.onMarkRead?.()}
              >
                Marquer comme lue
              </Button>
            )}
            {props.canCancel && n.status === 'PENDING' && (
              <Button
                variant="ghost"
                size="sm"
                loading={props.acting}
                disabled={props.acting}
                onClick={() => props.onCancel?.()}
              >
                Annuler
              </Button>
            )}
            {props.showOpen && props.onOpen && (
              <Button variant="ghost" size="sm" onClick={() => open()}>
                Voir
              </Button>
            )}
          </div>
        </article>
      );
    };
  },
});

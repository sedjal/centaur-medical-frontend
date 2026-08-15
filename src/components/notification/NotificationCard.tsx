import { defineComponent, type PropType } from 'vue';
import type { AppNotification } from '../../types';
import {
  formatNotificationDate,
  isNotificationUnread,
  notificationStatusLabel,
  notificationStatusVariant,
  notificationTypeLabel,
} from '../../utils/notifications';
import { Badge, Button, Card } from '../ui';

export default defineComponent({
  name: 'NotificationCard',
  props: {
    notification: { type: Object as PropType<AppNotification>, required: true },
    patientLabel: { type: String, default: undefined },
    canMarkRead: { type: Boolean, default: false },
    canCancel: { type: Boolean, default: false },
    acting: { type: Boolean, default: false },
    onMarkRead: { type: Function as PropType<() => void>, default: undefined },
    onCancel: { type: Function as PropType<() => void>, default: undefined },
    onOpen: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props) {
    return () => {
      const n = props.notification;
      const unread = isNotificationUnread(n.status);

      return (
        <div class={unread ? 'notif-card notif-card--unread' : 'notif-card'}>
          <Card padding="md">
            <div class="notif-card__head">
              <div class="notif-card__titles">
                <div class="notif-card__title-row">
                  {unread && <span class="notif-card__dot" aria-hidden="true" />}
                  <strong class="notif-card__title">{n.title}</strong>
                </div>
                <p class="notif-card__message">{n.message}</p>
                {props.patientLabel && (
                  <p class="notif-card__patient">Patient : {props.patientLabel}</p>
                )}
                {n.status === 'PENDING' && (
                  <p class="notif-card__scheduled">
                    Planifiée pour {formatNotificationDate(n.scheduledAt)}
                  </p>
                )}
                <p class="notif-card__date">
                  {n.status === 'PENDING'
                    ? `Créée le ${formatNotificationDate(n.createdAt)}`
                    : formatNotificationDate(n.sentAt || n.scheduledAt)}
                </p>
              </div>
              <div class="notif-card__meta">
                <Badge variant="info">{notificationTypeLabel(n.type)}</Badge>
                <Badge variant={notificationStatusVariant(n.status)}>
                  {notificationStatusLabel(n.status)}
                </Badge>
              </div>
            </div>

            <div class="notif-card__actions">
              {props.onOpen && (
                <Button variant="ghost" size="sm" onClick={() => props.onOpen?.()}>
                  Voir
                </Button>
              )}
              {props.canMarkRead && n.status === 'SENT' && (
                <Button
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
                  variant="danger"
                  size="sm"
                  loading={props.acting}
                  disabled={props.acting}
                  onClick={() => props.onCancel?.()}
                >
                  Annuler
                </Button>
              )}
            </div>
          </Card>
        </div>
      );
    };
  },
});

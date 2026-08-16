import { defineComponent, type PropType } from 'vue';
import type { AppNotification } from '../../types';
import {
  formatRelativeNotificationTime,
  isNotificationUnread,
} from '../../utils/notifications';

export default defineComponent({
  name: 'NotificationDropdown',
  props: {
    open: { type: Boolean, default: false },
    items: { type: Array as PropType<AppNotification[]>, default: () => [] },
    loading: { type: Boolean, default: false },
    onClose: { type: Function as PropType<() => void>, default: undefined },
    onOpenAll: { type: Function as PropType<() => void>, default: undefined },
    onOpenItem: { type: Function as PropType<(n: AppNotification) => void>, default: undefined },
  },
  setup(props) {
    return () => {
      if (!props.open) return null;
      const preview = props.items.slice(0, 8);

      return (
        <div class="notif-dropdown" role="menu" aria-label="Notifications récentes">
          <div class="notif-dropdown__head">
            <strong>Notifications</strong>
            <button
              type="button"
              class="notif-dropdown__link"
              onClick={() => props.onOpenAll?.()}
            >
              Voir toutes
            </button>
          </div>
          {props.loading && preview.length === 0 ? (
            <p class="notif-dropdown__empty">Chargement…</p>
          ) : preview.length === 0 ? (
            <p class="notif-dropdown__empty">Aucune notification récente.</p>
          ) : (
            <ul class="notif-dropdown__list">
              {preview.map((n) => {
                const unread = isNotificationUnread(n.status);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      class={
                        unread
                          ? 'notif-dropdown__item notif-dropdown__item--unread'
                          : 'notif-dropdown__item'
                      }
                      role="menuitem"
                      onClick={() => props.onOpenItem?.(n)}
                    >
                      <span
                        class={unread ? 'notif-item__dot' : 'notif-item__dot notif-item__dot--off'}
                        aria-hidden="true"
                      />
                      <span class="notif-dropdown__text">
                        <span class="notif-dropdown__title">{n.title}</span>
                        <span class="notif-dropdown__time">
                          {formatRelativeNotificationTime(n.sentAt || n.scheduledAt || n.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div class="notif-dropdown__foot">
            <button
              type="button"
              class="notif-dropdown__link"
              onClick={() => props.onOpenAll?.()}
            >
              Voir toutes les notifications
            </button>
          </div>
        </div>
      );
    };
  },
});

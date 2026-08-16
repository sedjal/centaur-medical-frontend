import { defineComponent, type PropType } from 'vue';
import { formatNotificationBadgeCount } from '../../utils/notifications';

export default defineComponent({
  name: 'NotificationBadge',
  props: {
    count: { type: Number, default: 0 },
    expanded: { type: Boolean, default: false },
    onClick: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props) {
    return () => {
      const label =
        props.count > 0
          ? `Notifications, ${props.count} non lue${props.count > 1 ? 's' : ''}`
          : 'Notifications';
      const badge = formatNotificationBadgeCount(props.count);

      return (
        <button
          type="button"
          class="topbar-icon-btn notif-badge-btn"
          title="Notifications"
          aria-label={label}
          aria-haspopup="true"
          aria-expanded={props.expanded ? 'true' : 'false'}
          onClick={() => props.onClick?.()}
        >
          <span class="topbar-bell" aria-hidden="true">
            ◔
          </span>
          {badge ? (
            <span class="notif-badge" aria-hidden="true">
              {badge}
            </span>
          ) : null}
        </button>
      );
    };
  },
});

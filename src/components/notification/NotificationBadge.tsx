import { defineComponent, type PropType } from 'vue';

export default defineComponent({
  name: 'NotificationBadge',
  props: {
    count: { type: Number, default: 0 },
    onClick: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props) {
    return () => (
      <button
        type="button"
        class="topbar-icon-btn notif-badge-btn"
        title="Notifications"
        aria-label={
          props.count > 0
            ? `Notifications, ${props.count} non lue${props.count > 1 ? 's' : ''}`
            : 'Notifications'
        }
        onClick={() => props.onClick?.()}
      >
        <span class="topbar-bell">◔</span>
        {props.count > 0 && (
          <span class="notif-badge" aria-hidden="true">
            {props.count > 99 ? '99+' : props.count}
          </span>
        )}
      </button>
    );
  },
});

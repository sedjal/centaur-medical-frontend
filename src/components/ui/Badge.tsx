import { defineComponent, type PropType } from 'vue';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export default defineComponent({
  name: 'CmBadge',
  props: {
    variant: { type: String as PropType<BadgeVariant>, default: 'default' },
  },
  setup(props, { slots }) {
    return () => (
      <span class={`cm-badge cm-badge--${props.variant}`}>{slots.default?.()}</span>
    );
  },
});

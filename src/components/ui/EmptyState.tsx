import { defineComponent, type PropType } from 'vue';

export default defineComponent({
  name: 'CmEmptyState',
  props: {
    title: { type: String, required: true },
    description: { type: String, default: undefined },
    icon: { type: [Object, String] as PropType<unknown>, default: undefined },
    action: { type: [Object, String] as PropType<unknown>, default: undefined },
  },
  setup(props, { slots }) {
    return () => (
      <div class="cm-empty-state" role="status">
        {props.icon != null && <div class="cm-empty-state__icon">{props.icon as never}</div>}
        <h3 class="cm-empty-state__title">{props.title}</h3>
        {props.description && <p class="cm-empty-state__desc">{props.description}</p>}
        {(props.action != null || slots.action) && (
          <div class="cm-empty-state__action">
            {props.action != null ? (props.action as never) : slots.action?.()}
          </div>
        )}
      </div>
    );
  },
});

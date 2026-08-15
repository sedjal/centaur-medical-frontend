import { defineComponent, type PropType } from 'vue';

export default defineComponent({
  name: 'CmPageHeader',
  props: {
    title: { type: String, required: true },
    description: { type: String, default: undefined },
    actions: { type: [Object, String] as PropType<unknown>, default: undefined },
  },
  setup(props, { slots }) {
    return () => (
      <div class="cm-page-header">
        <div class="cm-page-header__text">
          <h1 class="cm-page-header__title">{props.title}</h1>
          {props.description && <p class="cm-page-header__desc">{props.description}</p>}
        </div>
        {(props.actions != null || slots.actions) && (
          <div class="cm-page-header__actions">
            {props.actions != null ? (props.actions as never) : slots.actions?.()}
          </div>
        )}
      </div>
    );
  },
});

import { defineComponent, type PropType } from 'vue';

export type CardPadding = 'sm' | 'md' | 'lg' | 'none';

export default defineComponent({
  name: 'CmCard',
  props: {
    title: { type: String, default: undefined },
    subtitle: { type: String, default: undefined },
    padding: { type: String as PropType<CardPadding>, default: 'md' },
  },
  setup(props, { slots }) {
    return () => (
      <div class={`cm-card cm-card--pad-${props.padding}`}>
        {(props.title || props.subtitle) && (
          <div class="cm-card__header">
            {props.title && <h3 class="cm-card__title">{props.title}</h3>}
            {props.subtitle && <p class="cm-card__subtitle">{props.subtitle}</p>}
          </div>
        )}
        <div class="cm-card__body">{slots.default?.()}</div>
      </div>
    );
  },
});

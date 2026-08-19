import { defineComponent, type PropType } from 'vue';
import CmIcon, { type IconName } from './icons';

export type CardPadding = 'sm' | 'md' | 'lg' | 'none';

export default defineComponent({
  name: 'CmCard',
  props: {
    title: { type: String, default: undefined },
    subtitle: { type: String, default: undefined },
    padding: { type: String as PropType<CardPadding>, default: 'md' },
    actions: { type: [Object, String] as PropType<unknown>, default: undefined },
    icon: { type: String as PropType<IconName>, default: undefined },
  },
  setup(props, { slots }) {
    return () => (
      <div class={`cm-card cm-card--pad-${props.padding}`}>
        {(props.title || props.subtitle || props.actions != null || props.icon || slots.actions) && (
          <div class="cm-card__header">
            <div class="cm-card__header-text">
              <div class="cm-card__title-row">
                {props.icon && (
                  <span class="cm-card__icon">
                    <CmIcon name={props.icon} size={16} />
                  </span>
                )}
                {props.title && <h3 class="cm-card__title">{props.title}</h3>}
              </div>
              {props.subtitle && <p class="cm-card__subtitle">{props.subtitle}</p>}
            </div>
            {(props.actions != null || slots.actions) && (
              <div class="cm-card__actions">
                {props.actions != null ? (props.actions as never) : slots.actions?.()}
              </div>
            )}
          </div>
        )}
        <div class="cm-card__body">{slots.default?.()}</div>
      </div>
    );
  },
});

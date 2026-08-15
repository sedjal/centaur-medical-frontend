import { defineComponent, type PropType } from 'vue';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export default defineComponent({
  name: 'CmButton',
  props: {
    variant: { type: String as PropType<ButtonVariant>, default: 'primary' },
    size: { type: String as PropType<ButtonSize>, default: 'md' },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    type: { type: String as PropType<'button' | 'submit' | 'reset'>, default: 'button' },
    fullWidth: { type: Boolean, default: false },
    onClick: { type: Function as PropType<(e: MouseEvent) => void>, default: undefined },
  },
  setup(props, { slots }) {
    return () => {
      const isDisabled = props.disabled || props.loading;
      return (
        <button
          type={props.type}
          class={[
            'cm-btn',
            `cm-btn--${props.variant}`,
            `cm-btn--${props.size}`,
            props.fullWidth ? 'cm-btn--full' : '',
            props.loading ? 'cm-btn--loading' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          disabled={isDisabled}
          aria-busy={props.loading ? 'true' : undefined}
          onClick={(e: MouseEvent) => {
            if (isDisabled) return;
            props.onClick?.(e);
          }}
        >
          {props.loading && <span class="cm-btn__spinner" aria-hidden="true" />}
          <span class={props.loading ? 'cm-btn__label cm-btn__label--loading' : 'cm-btn__label'}>
            {slots.default?.()}
          </span>
        </button>
      );
    };
  },
});

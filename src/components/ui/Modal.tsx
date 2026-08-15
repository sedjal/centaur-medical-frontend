import { defineComponent, watch, onUnmounted, type PropType } from 'vue';

export default defineComponent({
  name: 'CmModal',
  props: {
    open: { type: Boolean, required: true },
    title: { type: String, default: undefined },
    size: { type: String as PropType<'md' | 'lg'>, default: 'md' },
    onClose: { type: Function as PropType<() => void>, required: true },
    footer: { type: [Object, String] as PropType<unknown>, default: undefined },
  },
  setup(props, { slots }) {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape' && props.open) {
        props.onClose();
      }
    }

    watch(
      () => props.open,
      (isOpen) => {
        if (isOpen) {
          document.addEventListener('keydown', onKeydown);
          document.body.style.overflow = 'hidden';
        } else {
          document.removeEventListener('keydown', onKeydown);
          document.body.style.overflow = '';
        }
      },
      { immediate: true }
    );

    onUnmounted(() => {
      document.removeEventListener('keydown', onKeydown);
      document.body.style.overflow = '';
    });

    return () => {
      if (!props.open) return null;
      return (
        <div class="cm-modal-backdrop" onClick={() => props.onClose()}>
          <div
            class={`cm-modal ${props.size === 'lg' ? 'cm-modal--lg' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={props.title ? 'cm-modal-title' : undefined}
            onClick={(e: Event) => e.stopPropagation()}
          >
            <div class="cm-modal__header">
              {props.title ? (
                <h2 id="cm-modal-title" class="cm-modal__title">
                  {props.title}
                </h2>
              ) : (
                <span />
              )}
              <button
                type="button"
                class="cm-modal__close"
                aria-label="Fermer"
                onClick={() => props.onClose()}
              >
                ×
              </button>
            </div>
            <div class="cm-modal__body">{slots.default?.()}</div>
            {(props.footer != null || slots.footer) && (
              <div class="cm-modal__footer">
                {props.footer != null ? (props.footer as never) : slots.footer?.()}
              </div>
            )}
          </div>
        </div>
      );
    };
  },
});

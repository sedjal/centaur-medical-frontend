import { defineComponent, computed } from 'vue';

let inputUid = 0;

export default defineComponent({
  name: 'CmInput',
  props: {
    label: { type: String, default: undefined },
    name: { type: String, default: undefined },
    value: { type: String, default: '' },
    placeholder: { type: String, default: undefined },
    type: { type: String, default: 'text' },
    disabled: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    error: { type: String, default: undefined },
    hint: { type: String, default: undefined },
    onInput: { type: Function, default: undefined },
  },
  setup(props) {
    const id = `cm-input-${++inputUid}`;
    const describedBy = computed(() => {
      if (props.error) return `${id}-error`;
      if (props.hint) return `${id}-hint`;
      return undefined;
    });

    return () => (
      <div class={`cm-field ${props.error ? 'cm-field--error' : ''}`}>
        {props.label && (
          <label class="cm-field__label" for={id}>
            {props.label}
            {props.required && <span class="cm-field__required" aria-hidden="true"> *</span>}
          </label>
        )}
        <input
          id={id}
          class="cm-input"
          type={props.type}
          name={props.name}
          value={props.value}
          placeholder={props.placeholder}
          disabled={props.disabled}
          required={props.required}
          aria-invalid={props.error ? 'true' : undefined}
          aria-describedby={describedBy.value}
          onInput={(ev: Event) => {
            const fn = props.onInput as ((value: string) => void) | undefined;
            fn?.((ev.target as HTMLInputElement).value);
          }}
        />
        {props.error ? (
          <p id={`${id}-error`} class="cm-field__error" role="alert">
            {props.error}
          </p>
        ) : props.hint ? (
          <p id={`${id}-hint`} class="cm-field__hint">
            {props.hint}
          </p>
        ) : null}
      </div>
    );
  },
});

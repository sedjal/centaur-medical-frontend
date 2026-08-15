import { defineComponent, computed, type PropType } from 'vue';

export interface SelectOption {
  value: string;
  label: string;
}

let selectUid = 0;

export default defineComponent({
  name: 'CmSelect',
  props: {
    label: { type: String, default: undefined },
    value: { type: String, default: '' },
    options: { type: Array as PropType<SelectOption[]>, required: true },
    placeholder: { type: String, default: undefined },
    disabled: { type: Boolean, default: false },
    error: { type: String, default: undefined },
    required: { type: Boolean, default: false },
    onChange: { type: Function as PropType<(value: string) => void>, default: undefined },
  },
  setup(props) {
    const id = `cm-select-${++selectUid}`;
    const describedBy = computed(() => (props.error ? `${id}-error` : undefined));

    return () => (
      <div class={`cm-field ${props.error ? 'cm-field--error' : ''}`}>
        {props.label && (
          <label class="cm-field__label" for={id}>
            {props.label}
            {props.required && <span class="cm-field__required" aria-hidden="true"> *</span>}
          </label>
        )}
        <select
          id={id}
          class="cm-select"
          value={props.value}
          disabled={props.disabled}
          required={props.required}
          aria-invalid={props.error ? 'true' : undefined}
          aria-describedby={describedBy.value}
          onChange={(ev: Event) => {
            props.onChange?.((ev.target as HTMLSelectElement).value);
          }}
        >
          {props.placeholder !== undefined && (
            <option value="">{props.placeholder}</option>
          )}
          {props.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {props.error && (
          <p id={`${id}-error`} class="cm-field__error" role="alert">
            {props.error}
          </p>
        )}
      </div>
    );
  },
});

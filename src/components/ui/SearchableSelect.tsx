import { defineComponent, ref, computed, watch, onMounted, onUnmounted, type PropType } from 'vue';
import type { SelectOption } from './Select';

export type SearchableSelectOption = SelectOption & {
  searchText?: string;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function filterSearchableOptions(
  options: SearchableSelectOption[],
  query: string
): SearchableSelectOption[] {
  const q = normalize(query);
  if (!q) return options;
  return options.filter((opt) => {
    const haystack = normalize(`${opt.label} ${opt.searchText || ''} ${opt.value}`);
    return haystack.includes(q);
  });
}

let comboboxUid = 0;

export default defineComponent({
  name: 'CmSearchableSelect',
  props: {
    label: { type: String, default: undefined },
    value: { type: String, default: '' },
    options: { type: Array as PropType<SearchableSelectOption[]>, required: true },
    placeholder: { type: String, default: 'Rechercher…' },
    searchPlaceholder: { type: String, default: 'Rechercher…' },
    disabled: { type: Boolean, default: false },
    error: { type: String, default: undefined },
    required: { type: Boolean, default: false },
    noResultsLabel: { type: String, default: 'Aucun résultat' },
    onChange: { type: Function as PropType<(value: string) => void>, default: undefined },
  },
  setup(props) {
    const id = `cm-combobox-${++comboboxUid}`;
    const listId = `${id}-list`;
    const open = ref(false);
    const query = ref('');
    const activeIndex = ref(0);
    const rootEl = ref<HTMLElement | null>(null);

    const selected = computed(
      () => props.options.find((opt) => opt.value === props.value) || null
    );

    const filtered = computed(() => filterSearchableOptions(props.options, query.value));

    const describedBy = computed(() => (props.error ? `${id}-error` : undefined));

    watch(filtered, (list) => {
      if (activeIndex.value >= list.length) activeIndex.value = 0;
    });

    function close() {
      open.value = false;
      query.value = '';
      activeIndex.value = 0;
    }

    function openMenu() {
      if (props.disabled) return;
      open.value = true;
      const idx = filtered.value.findIndex((opt) => opt.value === props.value);
      activeIndex.value = idx >= 0 ? idx : 0;
    }

    function pick(opt: SearchableSelectOption) {
      props.onChange?.(opt.value);
      close();
    }

    function onDocMouseDown(ev: MouseEvent) {
      if (!open.value) return;
      const el = rootEl.value;
      if (el && ev.target instanceof Node && !el.contains(ev.target)) {
        close();
      }
    }

    onMounted(() => {
      document.addEventListener('mousedown', onDocMouseDown);
    });
    onUnmounted(() => {
      document.removeEventListener('mousedown', onDocMouseDown);
    });

    return () => (
      <div
        class={`cm-field cm-combobox ${props.error ? 'cm-field--error' : ''}`}
        ref={(el: unknown) => {
          rootEl.value = (el as HTMLElement) || null;
        }}
      >
        {props.label && (
          <label class="cm-field__label" for={id}>
            {props.label}
            {props.required && (
              <span class="cm-field__required" aria-hidden="true">
                {' '}
                *
              </span>
            )}
          </label>
        )}
        <div class="cm-combobox__wrap">
        <div class={`cm-combobox__control ${open.value ? 'cm-combobox__control--open' : ''}`}>
          <input
            id={id}
            class="cm-combobox__input"
            type="text"
            role="combobox"
            autocomplete="off"
            aria-autocomplete="list"
            aria-expanded={open.value ? 'true' : 'false'}
            aria-controls={listId}
            aria-required={props.required ? 'true' : undefined}
            aria-invalid={props.error ? 'true' : undefined}
            aria-describedby={describedBy.value}
            disabled={props.disabled}
            placeholder={
              open.value
                ? props.searchPlaceholder
                : selected.value
                  ? undefined
                  : props.placeholder
            }
            value={open.value ? query.value : selected.value?.label || ''}
            onFocus={() => openMenu()}
            onInput={(ev: Event) => {
              query.value = (ev.target as HTMLInputElement).value;
              if (!open.value) openMenu();
              activeIndex.value = 0;
            }}
            onKeydown={(ev: KeyboardEvent) => {
              if (props.disabled) return;
              if (ev.key === 'ArrowDown') {
                ev.preventDefault();
                if (!open.value) {
                  openMenu();
                  return;
                }
                if (filtered.value.length) {
                  activeIndex.value = (activeIndex.value + 1) % filtered.value.length;
                }
              } else if (ev.key === 'ArrowUp') {
                ev.preventDefault();
                if (!open.value) {
                  openMenu();
                  return;
                }
                if (filtered.value.length) {
                  activeIndex.value =
                    (activeIndex.value - 1 + filtered.value.length) % filtered.value.length;
                }
              } else if (ev.key === 'Enter') {
                if (open.value) {
                  ev.preventDefault();
                  const opt = filtered.value[activeIndex.value];
                  if (opt) pick(opt);
                }
              } else if (ev.key === 'Escape') {
                ev.preventDefault();
                close();
              }
            }}
          />
          <span class="cm-combobox__chevron" aria-hidden="true">
            {open.value ? '▴' : '▾'}
          </span>
        </div>
        {open.value && (
          <ul id={listId} class="cm-combobox__menu" role="listbox">
            {filtered.value.length === 0 ? (
              <li class="cm-combobox__empty">{props.noResultsLabel}</li>
            ) : (
              filtered.value.map((opt, index) => (
                <li
                  key={opt.value}
                  class={[
                    'cm-combobox__option',
                    index === activeIndex.value ? 'cm-combobox__option--active' : '',
                    opt.value === props.value ? 'cm-combobox__option--selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="option"
                  aria-selected={opt.value === props.value ? 'true' : 'false'}
                  onMousedown={(ev: MouseEvent) => {
                    ev.preventDefault();
                    pick(opt);
                  }}
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        )}
        </div>
        {props.error && (
          <p id={`${id}-error`} class="cm-field__error" role="alert">
            {props.error}
          </p>
        )}
      </div>
    );
  },
});

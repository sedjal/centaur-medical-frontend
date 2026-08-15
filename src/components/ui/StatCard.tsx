import { defineComponent, type PropType } from 'vue';

export default defineComponent({
  name: 'CmStatCard',
  props: {
    title: { type: String, required: true },
    value: { type: [String, Number] as PropType<string | number>, required: true },
    description: { type: String, default: undefined },
    icon: { type: [Object, String] as PropType<unknown>, default: undefined },
    trend: {
      type: Object as PropType<{ value: string; positive?: boolean }>,
      default: undefined,
    },
    loading: { type: Boolean, default: false },
  },
  setup(props) {
    return () => (
      <div class="cm-stat-card">
        {props.icon != null && <div class="cm-stat-card__icon">{props.icon as never}</div>}
        <div class="cm-stat-card__label">{props.title}</div>
        <div class="cm-stat-card__value">
          {props.loading ? <span class="cm-stat-card__skeleton" aria-hidden="true" /> : props.value}
        </div>
        {props.description && <div class="cm-stat-card__desc">{props.description}</div>}
        {props.trend && (
          <div
            class={[
              'cm-stat-card__trend',
              props.trend.positive === false ? 'cm-stat-card__trend--neg' : 'cm-stat-card__trend--pos',
            ].join(' ')}
          >
            {props.trend.value}
          </div>
        )}
      </div>
    );
  },
});

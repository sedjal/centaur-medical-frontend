import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'Pagination',
  props: {
    page: { type: Number, required: true },
    limit: { type: Number, required: true },
    total: { type: Number, required: true },
    onPageChange: { type: Function as unknown as () => (page: number) => void, default: undefined },
  },
  setup(props) {
    const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.limit)));
    const from = computed(() => Math.min((props.page - 1) * props.limit + 1, props.total));
    const to = computed(() => Math.min(props.page * props.limit, props.total));

    function go(p: number) {
      if (p < 1 || p > totalPages.value || p === props.page) return;
      props.onPageChange?.(p);
    }

    return () => {
      if (props.total <= props.limit) return null;
      return (
        <div class="cm-pagination">
          <span class="cm-pagination__info">
            {from.value}–{to.value} sur {props.total}
          </span>
          <div class="cm-pagination__controls">
            <button
              class="cm-pagination__btn"
              disabled={props.page <= 1}
              onClick={() => go(1)}
              aria-label="Première page"
            >
              «
            </button>
            <button
              class="cm-pagination__btn"
              disabled={props.page <= 1}
              onClick={() => go(props.page - 1)}
              aria-label="Page précédente"
            >
              ‹
            </button>
            <span class="cm-pagination__current">
              {props.page} / {totalPages.value}
            </span>
            <button
              class="cm-pagination__btn"
              disabled={props.page >= totalPages.value}
              onClick={() => go(props.page + 1)}
              aria-label="Page suivante"
            >
              ›
            </button>
            <button
              class="cm-pagination__btn"
              disabled={props.page >= totalPages.value}
              onClick={() => go(totalPages.value)}
              aria-label="Dernière page"
            >
              »
            </button>
          </div>
        </div>
      );
    };
  },
});

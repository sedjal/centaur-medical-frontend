import { defineComponent, type PropType } from 'vue';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';

export interface DataTableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  render?: (row: T) => unknown;
  className?: string;
}

export default defineComponent({
  name: 'CmDataTable',
  props: {
    // Vue props lose generics — accept any row shape (Patient, etc.)
    columns: { type: Array as PropType<DataTableColumn<any>[]>, required: true },
    rows: { type: Array as PropType<any[]>, default: () => [] },
    rowKey: { type: String, default: 'id' },
    loading: { type: Boolean, default: false },
    emptyTitle: { type: String, default: 'Aucun résultat' },
    emptyDescription: { type: String, default: undefined },
  },
  setup(props) {
    function cellValue(row: any, col: DataTableColumn<any>) {
      if (col.render) return col.render(row) as never;
      const val = row?.[col.key];
      if (val == null || val === '') return '—';
      return String(val);
    }

    return () => {
      if (props.loading) {
        return (
          <div class="cm-data-table cm-data-table--loading">
            <LoadingState message="Chargement…" />
          </div>
        );
      }

      if (!props.rows.length) {
        return (
          <div class="cm-data-table cm-data-table--empty">
            <EmptyState title={props.emptyTitle} description={props.emptyDescription} />
          </div>
        );
      }

      return (
        <div class="cm-data-table">
          <table class="cm-data-table__table">
            <thead>
              <tr>
                {props.columns.map((col) => (
                  <th key={col.key} class={col.className}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.rows.map((row, idx) => (
                <tr key={String(row[props.rowKey] ?? idx)}>
                  {props.columns.map((col) => (
                    <td key={col.key} class={col.className}>
                      {cellValue(row, col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };
  },
});

import { defineComponent, type PropType } from 'vue';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';

export type DataTableRow = object;

export interface DataTableColumn<T extends DataTableRow = DataTableRow> {
  key: string;
  label: string;
  render?: (row: T) => unknown;
  className?: string;
}

/** Vue props cannot be generic — preserves typed `render` at call sites. */
export function defineDataTableColumns<T extends DataTableRow>(
  columns: DataTableColumn<T>[]
): DataTableColumn[] {
  return columns as DataTableColumn[];
}

export default defineComponent({
  name: 'CmDataTable',
  props: {
    columns: { type: Array as PropType<DataTableColumn[]>, required: true },
    rows: { type: Array as PropType<DataTableRow[]>, default: () => [] },
    rowKey: { type: String, default: 'id' },
    loading: { type: Boolean, default: false },
    emptyTitle: { type: String, default: 'Aucun résultat' },
    emptyDescription: { type: String, default: undefined },
  },
  setup(props) {
    function cellValue(row: DataTableRow, col: DataTableColumn) {
      if (col.render) return col.render(row);
      const record = row as Record<string, unknown>;
      const val = record[col.key];
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
                <tr key={String((row as Record<string, unknown>)[props.rowKey] ?? idx)}>
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

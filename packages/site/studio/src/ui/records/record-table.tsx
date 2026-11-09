import type { ReactNode } from 'react';
export interface StudioRecordColumn<Row> {
  readonly id: string;
  readonly label: string;
  readonly render: (record: Row) => ReactNode;
}
/** Hosts own columns and query/pagination policy; the table owns selection semantics and stable layout hooks. */
export function StudioRecordTable<Row>({
  records,
  identity,
  selectedId,
  onSelect,
  primary,
  columns,
  title,
  tableLabel,
  source,
}: {
  readonly records: readonly Row[];
  readonly identity: (record: Row) => string;
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
  readonly primary: StudioRecordColumn<Row>;
  readonly columns: readonly StudioRecordColumn<Row>[];
  readonly title: string;
  readonly tableLabel: string;
  readonly source?: ReactNode;
}) {
  return (
    <section className="ui-studio-surface" aria-label={title}>
      <div className="ui-studio-section-heading">
        <h2>{title}</h2>
        {source}
      </div>
      <div className="ui-studio-table-scroll" role="region" aria-label={tableLabel} tabIndex={0}>
        <table className="ui-studio-record-table">
          <caption className="ui-studio-sr-only">{tableLabel}</caption>
          <thead>
            <tr>
              {[primary, ...columns].map((column) => (
                <th key={column.id} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const id = identity(record);
              return (
                <tr key={id} data-selected={id === selectedId || undefined}>
                  <th scope="row">
                    <button
                      className="ui-studio-record-link"
                      type="button"
                      aria-current={id === selectedId ? 'true' : undefined}
                      onClick={() => onSelect(id)}
                    >
                      {primary.render(record)}
                    </button>
                  </th>
                  {columns.map((column) => (
                    <td key={column.id}>{column.render(record)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

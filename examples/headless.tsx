import {
  type ColumnDef,
  useDataTable,
  useFrontendData,
} from "@adapttable/core";

interface Row {
  id: string;
  name: string;
  team: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada", team: "Core" },
  { id: "2", name: "Alan", team: "Platform" },
];

const columns: ColumnDef<Row>[] = [
  { key: "name", sortable: true },
  { key: "team" },
];

/**
 * Fully headless: no UI kit, no styles — just `@adapttable/core` and your
 * own markup, wired with prop-getters. Accessible attributes (roles,
 * aria-sort, …) come for free.
 */
export function HeadlessExample() {
  const source = useFrontendData({ data: ROWS, columns });
  const t = useDataTable({ source, columns, rowKey: (r) => r.id });

  return (
    <div>
      <input {...t.getSearchInputProps()} />
      <table {...t.getTableProps()}>
        <thead>
          <tr {...t.getHeaderRowProps()}>
            {t.columns.map((c) => (
              <th key={c.key} {...t.getHeaderCellProps(c)}>
                {c.sortable ? (
                  <button {...t.getSortButtonProps(c)}>{c.header}</button>
                ) : (
                  c.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((row, i) => (
            <tr key={t.getRowKey(row)} {...t.getRowProps(row, i)}>
              {t.columns.map((c) => (
                <td key={c.key} {...t.getCellProps(c)}>
                  {t.getCellContent(c, row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

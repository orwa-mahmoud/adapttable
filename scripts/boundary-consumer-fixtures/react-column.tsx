/**
 * React consumer: typed rendering callbacks on ColumnDef.
 */
import type { ColumnDef } from "@adapttable/react";
import type { ReactNode } from "react";

interface Row {
  id: string;
  name: string;
  spend: number;
}

const columns: ColumnDef<Row>[] = [
  {
    key: "name",
    header: "Name",
    renderHeader: (): ReactNode => <span>Name</span>,
    renderFooter: (): ReactNode => <span>Total</span>,
    accessor: (row: Row): ReactNode => <strong>{row.name}</strong>,
  },
  {
    key: "spend",
    align: "end",
    accessor: (row: Row): ReactNode => (
      <span data-row={row.id}>{row.spend.toFixed(2)}</span>
    ),
  },
];

export function columnKeys(): string[] {
  return columns.map((column) => column.key);
}

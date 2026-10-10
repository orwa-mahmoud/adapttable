/**
 * React consumer: typed rendering callbacks on ColumnDef.
 */
import type {
  ColumnDef,
  ReactColumnGroupDef as RootReactColumnGroupDef,
} from "@adapttable/react";
import {
  flattenReactColumnTree,
  type ReactColumnGroupDef,
  renderedRowsOf,
} from "@adapttable/react/adapter";
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

// The adapter route names the canonical React group type used by its helper.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Assert<T extends true> = T;
export type ReactGroupIdentity = Assert<
  Equal<ReactColumnGroupDef<Row>, RootReactColumnGroupDef<Row>>
>;

const group: ReactColumnGroupDef<Row> = {
  header: "Customer",
  children: columns,
};
export function groupedColumnKeys(): string[] {
  return flattenReactColumnTree<Row>([group]).leaves.map(
    (column) => column.key
  );
}

// Native renderers consume the same typed data-leaf inventory as row gestures.
export function visibleRowNames(rows: readonly Row[]): readonly string[] {
  const visible: readonly Row[] = renderedRowsOf({
    source: { rows },
    tree: { entries: rows.map((row) => ({ row })) },
  });
  return visible.map((row) => row.name);
}
export type RenderedRowIdentity = Assert<
  Equal<ReturnType<typeof renderedRowsOf<Row>>, readonly Row[]>
>;

/**
 * A real table for the agent tests: an unstyled `DataTable` over the test's
 * rows, kept out of sight, that hands back the neutral surface and the live
 * view it publishes — the same ones a mounted table gives its agent.
 */
import {
  type FeatureProviderProps,
  type TableFeature,
  type TableRuntimeView,
  useTableRuntime,
} from "@adapttable/react/adapter";
import { type ColumnDef, DataTable } from "@adapttable/unstyled";
import { useEffect, useState } from "react";

/** The neutral surface a frontend table publishes. */
export type NeutralTable = NonNullable<TableRuntimeView["neutralTable"]>;

/** What a real table publishes, read after each of its commits. */
export interface PublishedTable {
  readonly neutral: NeutralTable;
  readonly view: TableRuntimeView;
}

/** A row the probe tables hold: anything with a string id. */
export interface ProbeRow {
  readonly id: string;
}

function publishedProbe<TRow extends ProbeRow>(
  onPublish: (table: PublishedTable) => void
): TableFeature<TRow> {
  function Provider({ children }: FeatureProviderProps) {
    const runtime = useTableRuntime();
    useEffect(() => {
      const view = runtime.view();
      if (view?.neutralTable) onPublish({ neutral: view.neutralTable, view });
    });
    return children;
  }
  return { id: "published-probe", provider: { Provider } };
}

/** Whether a row object carries a `name` field worth declaring a column for. */
function hasNameField(row: unknown): boolean {
  return typeof row === "object" && row !== null && "name" in row;
}

/**
 * A real unstyled table over `rows`. Without `columns` it declares a sortable
 * `name` column when the rows have one.
 */
export function RealTable<TRow extends ProbeRow>({
  rows,
  columns,
  onPublish,
}: {
  readonly rows: readonly TRow[];
  readonly columns?: ColumnDef<TRow>[];
  readonly onPublish: (table: PublishedTable) => void;
}) {
  const [features] = useState(() => [publishedProbe<TRow>(onPublish)]);
  return (
    <div hidden>
      <DataTable<TRow>
        data={rows}
        columns={
          columns ??
          (hasNameField(rows[0])
            ? [{ key: "name", header: "Name", sortable: true }]
            : [])
        }
        rowKey={(row) => row.id}
        features={features}
        urlSync={false}
      />
    </div>
  );
}

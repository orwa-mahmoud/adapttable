import type { TableFeature } from "@adapttable/core";
import {
  pivot,
  type PivotConfig,
  type PivotField,
  type PivotRow,
  pivotTableModel,
} from "@adapttable/core/pivot";
import { getLabels } from "@adapttable/i18n";
import type { DataTableProps } from "@adapttable/mantine";
import { Suspense, useMemo } from "react";

import { kitClassNames, kitTable } from "./kitProviders";

/** Max minus min — a named aggregator the URL can carry as `range:budget`. */
function rangeOf(values: readonly unknown[]): number | undefined {
  const numbers = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  );
  if (numbers.length === 0) return undefined;
  return Math.max(...numbers) - Math.min(...numbers);
}

const RANGE_FEATURE: TableFeature<PivotRow> = {
  id: "range",
  setup(host) {
    host.registerAggregator("range", rangeOf);
  },
};

const RANGE_BY_NAME = new Map([["range", rangeOf]]);

/**
 * A pivot, rendered by whichever kit the reader picked.
 *
 * This page used to draw its own `<table>`, because a `PivotResult` is data and
 * no adapter took data in that shape. That is a showcase rule broken in the one
 * place it matters most — a demo of a feature, drawn by the demo instead of by
 * the library — and it also meant every host wanting a pivot in their own kit
 * had to write the same markup. `pivotTableModel` closes it: the result becomes
 * the props a `DataTable` already takes, so the pivot is a real MUI table in
 * MUI and a real antd table in antd, with the kit's own header groups, footer
 * and sticky header.
 *
 * The fold control is this page's, not core's: core ships no user-facing
 * controls, so the row header takes a renderer and the button below is the
 * host's. It is wired to the same collapse set the engine reads, which is what
 * makes a folded group survive a shared link.
 */

/** Cells are money on this dataset; the format belongs to the host. */
const money = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export interface PivotTableViewProps<TRow> {
  /**
   * Which kit renders it. Its theme provider is the caller's — the panel
   * on this page needs the same one, so it wraps both.
   */
  kit: string;
  /** The rows to pivot — already materialized, filtering happens upstream. */
  rows: readonly TRow[];
  /** The fields the panel offers, for the column captions. */
  fields: readonly PivotField[];
  config: PivotConfig;
  /** Subtotal keys the reader folded away. */
  collapsed: ReadonlySet<string>;
  /** Fold or unfold one subtotal group. */
  onToggleFold: (key: string) => void;
  /** A panel docked beside the table — the Feature Lab docks the pivot builder. */
  sidePanel?: DataTableProps<PivotRow>["sidePanel"];
}

/** What a line is called, and — on a subtotal — the control that folds it. */
function RowHeader({
  row,
  folded,
  onToggleFold,
}: Readonly<{
  row: PivotRow;
  folded: boolean;
  onToggleFold: (key: string) => void;
}>) {
  if (row.kind !== "subtotal") return <>{row.label}</>;
  return (
    <button
      type="button"
      className="pivot-fold"
      aria-expanded={!folded}
      data-testid="pivot-fold"
      onClick={() => {
        onToggleFold(row.key);
      }}
    >
      <span aria-hidden="true" className="pivot-fold__mark">
        {folded ? "▶" : "▼"}
      </span>
      {row.label}
    </button>
  );
}

export function PivotTableView<TRow>({
  kit,
  rows,
  fields,
  config,
  collapsed,
  onToggleFold,
  sidePanel,
}: Readonly<PivotTableViewProps<TRow>>) {
  const labels = getLabels("en");
  const model = useMemo(() => {
    const result = pivot(rows, config, {
      collapsed,
      aggregators: RANGE_BY_NAME,
      format: (value) =>
        typeof value === "number" ? money.format(value) : value,
    });
    return pivotTableModel(result, {
      fields,
      labels,
      // The corner cell names what is down the side, which is the question the
      // rows answer — "Team / Role", not the generic word "Rows".
      rowHeader:
        config.rows
          .map((key) => fields.find((field) => field.key === key)?.label ?? key)
          .join(" / ") || labels.pivotTotal,
      renderRowHeader: (row) => (
        <RowHeader
          row={row}
          folded={collapsed.has(row.key)}
          onToggleFold={onToggleFold}
        />
      ),
    });
  }, [rows, config, collapsed, fields, labels, onToggleFold]);

  const Table = kitTable<PivotRow>(kit);
  return (
    <div className="pivot-table-wrap" data-testid="pivot-table">
      <Suspense fallback={null}>
        <Table
          features={[RANGE_FEATURE]}
          data={model.rows}
          columns={model.columns}
          rowKey={model.rowKey}
          summaryRow={model.summaryRow}
          rowClassName={(row) => `pivot-line pivot-line--${row.kind}`}
          labels={labels}
          classNames={kitClassNames(kit)}
          // Only the live demo writes the address bar. This table must not
          // add search, paging, or a second namespace beside the pivot.
          urlSync={false}
          searchable={false}
          // A pivot is a shape, not a feed: every line of it is meant to be
          // read together, so the page shows them all. Paged mode with a limit
          // above any pivot this dataset can produce is what keeps the
          // rows-per-page control out of a page about one feature.
          defaults={{ limit: 500 }}
          paginationMode="paged"
          stickyHeader
          sidePanel={sidePanel}
        />
      </Suspense>
    </div>
  );
}

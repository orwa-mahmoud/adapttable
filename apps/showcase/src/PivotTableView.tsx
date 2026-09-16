import { sidePanel as antdSidePanel } from "@adapttable/antd/side-panel";
import { sidePanel as baseUiSidePanel } from "@adapttable/base-ui/side-panel";
import { sidePanel as chakraSidePanel } from "@adapttable/chakra/side-panel";
import {
  pivot,
  type PivotConfig,
  type PivotField,
  type PivotRow,
} from "@adapttable/core/pivot";
import { getLabels } from "@adapttable/i18n";
import type {} from "@adapttable/mantine";
import { sidePanel as mantineSidePanel } from "@adapttable/mantine/side-panel";
import { sidePanel as muiSidePanel } from "@adapttable/mui/side-panel";
import { sidePanel as radixSidePanel } from "@adapttable/radix/side-panel";
import type { FeatureProps, SidePanelOptions } from "@adapttable/react";
import { rowAppearance, type TableFeature } from "@adapttable/react/features";
import { pivotTableModel } from "@adapttable/react/pivot";
import { sidePanel as shadcnSidePanel } from "@adapttable/shadcn/side-panel";
import { sidePanel as unstyledSidePanel } from "@adapttable/unstyled/side-panel";
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
  sidePanel?: NonNullable<FeatureProps<PivotRow>["sidePanel"]>;
}

/**
 * `kit`'s side-panel feature, by kit key.
 *
 * A side panel is drawn by the adapter, so a table that shows one has to
 * import that kit's factory — a prop alone brings no panel. Synchronous
 * because a feature is a plain object: there is nothing to suspend on, and a
 * lazily-armed feature would render the table once without its panel.
 */
const SIDE_PANELS: Record<
  string,
  (options: SidePanelOptions) => TableFeature<never>
> = {
  mantine: mantineSidePanel,
  mui: muiSidePanel,
  chakra: chakraSidePanel,
  antd: antdSidePanel,
  radix: radixSidePanel,
  "base-ui": baseUiSidePanel,
  shadcn: shadcnSidePanel,
  tailwind: unstyledSidePanel,
};

/** `kit`'s side-panel feature, falling back to Mantine's for an unknown key. */
export function kitSidePanel<TRow>(
  kit: string,
  options: SidePanelOptions
): TableFeature<TRow> {
  const make = SIDE_PANELS[kit] ?? mantineSidePanel;
  return make(options) as TableFeature<TRow>;
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
          // The docked builder is what pivoted this table, so it travels with
          // it — and a panel is drawn by the kit, which means importing the
          // kit's own feature rather than passing a prop.
          features={[
            rowAppearance<PivotRow>({
              rowClassName: (row) => `pivot-line pivot-line--${row.kind}`,
            }),
            RANGE_FEATURE,
            ...(sidePanel ? [kitSidePanel<PivotRow>(kit, sidePanel)] : []),
          ]}
          data={model.rows}
          columns={model.columns}
          rowKey={model.rowKey}
          summaryRow={model.summaryRow}
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
        />
      </Suspense>
    </div>
  );
}

/**
 * Inline sparkline charts — `@adapttable/react/sparkline`.
 *
 * Bar, line and area, drawn as SVG so a cell never downloads a chart
 * library. The entry is a separate package path: a table that does not
 * import this file never pays for it.
 */
import {
  finiteSparklineValues,
  sparklineExportValue,
  sparklineSummary,
} from "@adapttable/core";
import { createElement, type ReactElement, type ReactNode } from "react";

import type { ColumnDef } from "../columnDef";

export type { ColumnDef };
export {
  finiteSparklineValues,
  sparklineExportValue,
  sparklineSummary,
} from "@adapttable/core";

/**
 * Props for {@link Sparkline}.
 *
 * @public
 */
export interface SparklineProps {
  /** The series, oldest first. Non-finite values are dropped. */
  values: readonly number[];
  /** Default `"line"`. */
  kind?: SparklineKind;
  /** SVG width in CSS pixels. Default 80. */
  width?: number;
  /** SVG height in CSS pixels. Default 28. */
  height?: number;
  /** Stroke / bar fill. Default `currentColor` so the kit theme wins. */
  color?: string;
  /** Accessible summary. Defaults to `sparklineSummary`. */
  label?: string;
}

/**
 * How `sparklineColumn` is declared.
 *
 * @public
 */
export interface SparklineColumnSpec<TRow> {
  /** Stable key for the entry. */
  key: string;
  /** Caption for the column. */
  header?: ReactNode;
  /** The series on this row. */
  values: (row: TRow) => readonly number[];
  /** Which sparkline to draw. */
  kind?: SparklineKind;
  /** Width in pixels. */
  width?: number;
  /** Height in pixels. */
  height?: number;
  /** Stroke or bar fill. Defaults to `currentColor` so the kit theme wins. */
  color?: string;
  /** Override the default numeric summary. */
  label?: (values: readonly number[], row: TRow) => string;
  /** Extra ColumnDef fields. Accessor / sort / export from this helper win. */
  column?: Partial<ColumnDef<TRow>>;
}

/**
 * A mini chart sized to a cell. Fixed width/height — no observers — so a
 * virtualized row can mount and unmount it without measuring.
 *
 * @public
 */
export function Sparkline({
  values,
  kind = "line",
  width = SPARKLINE_DEFAULT_WIDTH,
  height = SPARKLINE_DEFAULT_HEIGHT,
  color = "currentColor",
  label,
}: Readonly<SparklineProps>): ReactElement {
  const series = finiteSparklineValues(values);
  const summary = label ?? sparklineSummary(values);
  const bars = sparklineBars(series, width, height);
  const line = sparklineLinePath(series, width, height);
  const area = sparklineAreaPath(series, width, height);
  let mark: ReactElement;
  if (kind === "bar") {
    mark = createElement(
      "g",
      { fill: color },
      bars.map((bar) =>
        createElement("rect", {
          key: `${bar.x}:${bar.y}`,
          x: bar.x,
          y: bar.y,
          width: bar.width,
          height: bar.height,
        })
      )
    );
  } else if (kind === "area") {
    mark = createElement("g", null, [
      createElement("path", {
        key: "fill",
        d: area,
        fill: color,
        fillOpacity: 0.25,
      }),
      createElement("path", {
        key: "line",
        d: line,
        fill: "none",
        stroke: color,
        strokeWidth: 1.25,
      }),
    ]);
  } else {
    mark = createElement("path", {
      d: line,
      fill: "none",
      stroke: color,
      strokeWidth: 1.25,
    });
  }
  return (
    <svg
      role="img"
      aria-label={summary}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      data-adapttable-part="sparkline"
      data-kind={kind}
      style={{ display: "block", direction: "ltr" }}
    >
      <title>{summary}</title>
      {mark}
    </svg>
  );
}

/**
 * A column whose cell is a sparkline.
 *
 * Sort and export read the numbers, never the SVG.
 *
 * @public
 */
export function sparklineColumn<TRow>(
  spec: SparklineColumnSpec<TRow>
): ColumnDef<TRow> {
  return {
    ...spec.column,
    key: spec.key,
    header: spec.header,
    accessor: (row) => {
      const values = spec.values(row);
      return (
        <Sparkline
          values={values}
          kind={spec.kind}
          width={spec.width}
          height={spec.height}
          color={spec.color}
          label={spec.label?.(values, row)}
        />
      );
    },
    sortValue: (row) => sparklineSortValue(spec.values(row)),
    exportValue: (row) => sparklineExportValue(spec.values(row)),
  };
}

export type { CellEditor } from "@adapttable/core";
export type { ColumnFilter } from "@adapttable/core";
export type {
  CellProps,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
  SortableValue,
} from "@adapttable/core";

import {
  SPARKLINE_DEFAULT_HEIGHT,
  SPARKLINE_DEFAULT_WIDTH,
  sparklineAreaPath,
  sparklineBars,
  type SparklineKind,
  sparklineLinePath,
  sparklineSortValue,
} from "@adapttable/core/binding";

export { type SparklineKind } from "@adapttable/core/binding";

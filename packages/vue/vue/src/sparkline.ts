/** Accessible SVG sparklines reuse the neutral geometry and numeric output. */
import {
  finiteSparklineValues,
  SPARKLINE_DEFAULT_HEIGHT,
  SPARKLINE_DEFAULT_WIDTH,
  sparklineAreaPath,
  sparklineBars,
  sparklineExportValue,
  type SparklineKind,
  sparklineLinePath,
  sparklineSortValue,
  sparklineSummary,
} from "@adapttable/core";
import { h, type VNodeChild } from "vue";

import type { ColumnDef } from "./columnDef";
export {
  finiteSparklineValues,
  sparklineExportValue,
  type SparklineKind,
  sparklineSummary,
} from "@adapttable/core";
export interface SparklineProps {
  readonly values: readonly number[];
  readonly kind?: SparklineKind;
  readonly width?: number;
  readonly height?: number;
  readonly color?: string;
  readonly label?: string;
}
export function Sparkline({
  values,
  kind = "line",
  width = SPARKLINE_DEFAULT_WIDTH,
  height = SPARKLINE_DEFAULT_HEIGHT,
  color = "currentColor",
  label,
}: SparklineProps): VNodeChild {
  const series = finiteSparklineValues(values);
  const summary = label ?? sparklineSummary(values);
  const line = () =>
    h("path", {
      d: sparklineLinePath(series, width, height),
      fill: "none",
      stroke: color,
      strokeWidth: 1.25,
    });
  let mark: VNodeChild;
  if (kind === "bar")
    mark = h(
      "g",
      { fill: color },
      sparklineBars(series, width, height).map((bar) =>
        h("rect", { key: `${bar.x}:${bar.y}`, ...bar })
      )
    );
  else if (kind === "area")
    mark = h("g", null, [
      h("path", {
        d: sparklineAreaPath(series, width, height),
        fill: color,
        fillOpacity: 0.25,
      }),
      line(),
    ]);
  else mark = line();
  return h(
    "svg",
    {
      role: "img",
      "aria-label": summary,
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      "data-adapttable-part": "sparkline",
      "data-kind": kind,
      style: { display: "block", direction: "ltr" },
    },
    [h("title", summary), mark]
  );
}
export interface SparklineColumnSpec<TRow> extends Omit<
  SparklineProps,
  "values" | "label"
> {
  readonly key: string;
  readonly header?: string;
  readonly values: (row: TRow) => readonly number[];
  readonly label?: (values: readonly number[], row: TRow) => string;
  readonly column?: Partial<ColumnDef<TRow>>;
}
export function sparklineColumn<TRow>(
  spec: SparklineColumnSpec<TRow>
): ColumnDef<TRow> {
  return {
    ...spec.column,
    key: spec.key,
    header: spec.header,
    accessor: spec.values,
    cell: ({ row }) =>
      Sparkline({
        ...spec,
        values: spec.values(row),
        label: spec.label?.(spec.values(row), row),
      }),
    sortValue: (row) => sparklineSortValue(spec.values(row)),
    exportValue: (row) => sparklineExportValue(spec.values(row)),
  };
}

// Types this entry's own signatures hand back.
export type {
  CellContext,
  ColumnDef,
  ComponentRenderer,
  FooterContext,
  HeaderContext,
  Renderer,
  RenderFunction,
} from "./columnDef";

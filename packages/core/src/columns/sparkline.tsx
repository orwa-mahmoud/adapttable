/**
 * Inline sparkline charts — `@adapttable/core/sparkline`.
 *
 * Bar, line and area, drawn as SVG so a cell never downloads a chart
 * library. The entry is a separate package path: a table that does not
 * import this file never pays for it.
 */
import { createElement, type ReactElement, type ReactNode } from "react";

import type { ColumnDef } from "../types";

/**
 * The three marks this entry draws.
 *
 * @public
 */
export type SparklineKind = "bar" | "line" | "area";

/** One bar in the bar mark. */
interface SparklineBar {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  /** Accessible summary. Defaults to {@link sparklineSummary}. */
  label?: string;
}

/**
 * How {@link sparklineColumn} is declared.
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

const DEFAULT_WIDTH = 80;
const DEFAULT_HEIGHT = 28;
const PAD = 2;
const BAR_GAP = 1;

/**
 * Drop NaN / Infinity so a bad point cannot collapse the scale.
 *
 * @public
 */
export function finiteSparklineValues(values: readonly number[]): number[] {
  return values.filter((value) => Number.isFinite(value));
}

/**
 * Default accessible summary — numbers only, so it is locale-neutral.
 *
 * @public
 */
export function sparklineSummary(values: readonly number[]): string {
  const series = finiteSparklineValues(values);
  if (series.length === 0) return "no values";
  const first = series[0];
  if (series.length === 1) {
    return `1 value, ${first}`;
  }
  let min = first ?? 0;
  let max = first ?? 0;
  for (const value of series) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const last = series.at(-1);
  return `${series.length} values, min ${min}, max ${max}, last ${last}`;
}

/**
 * CSV / xlsx fallback — the numbers, not the SVG.
 *
 * @public
 */
export function sparklineExportValue(values: readonly number[]): string {
  return finiteSparklineValues(values).join(", ");
}

function scaleY(
  value: number,
  min: number,
  max: number,
  height: number
): number {
  const inner = height - PAD * 2;
  if (min === max) return PAD + inner / 2;
  return PAD + inner * (1 - (value - min) / (max - min));
}

function extent(series: readonly number[]): { min: number; max: number } {
  const first = series[0] ?? 0;
  let min = first;
  let max = first;
  for (const value of series) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max };
}

function sparklineBars(
  series: readonly number[],
  width: number,
  height: number
): SparklineBar[] {
  if (series.length === 0) return [];
  const { min, max } = extent(series);
  const inner = width - PAD * 2;
  const barWidth = Math.max(
    1,
    (inner - BAR_GAP * (series.length - 1)) / series.length
  );
  const baseline = height - PAD;
  return series.map((value, index) => {
    const x = PAD + index * (barWidth + BAR_GAP);
    const top = scaleY(value, min, max, height);
    return { x, y: top, width: barWidth, height: Math.max(1, baseline - top) };
  });
}

function sparklinePoints(
  series: readonly number[],
  width: number,
  height: number
): { x: number; y: number }[] {
  if (series.length === 0) return [];
  const { min, max } = extent(series);
  const inner = width - PAD * 2;
  if (series.length === 1) {
    return [{ x: width / 2, y: scaleY(series[0] ?? 0, min, max, height) }];
  }
  return series.map((value, index) => ({
    x: PAD + (inner * index) / (series.length - 1),
    y: scaleY(value, min, max, height),
  }));
}

function sparklineLinePath(
  series: readonly number[],
  width: number,
  height: number
): string {
  const points = sparklinePoints(series, width, height);
  if (points.length === 0) return "";
  const first = points[0];
  if (first === undefined) return "";
  if (points.length === 1) {
    return `M${first.x} ${first.y} h0.01`;
  }
  return points
    .map((point, index) =>
      index === 0 ? `M${point.x} ${point.y}` : `L${point.x} ${point.y}`
    )
    .join(" ");
}

function sparklineAreaPath(
  series: readonly number[],
  width: number,
  height: number
): string {
  const line = sparklineLinePath(series, width, height);
  if (line === "") return "";
  const points = sparklinePoints(series, width, height);
  const last = points.at(-1);
  const first = points[0];
  if (last === undefined || first === undefined) return "";
  const baseline = height - PAD;
  return `${line} L${last.x} ${baseline} L${first.x} ${baseline} Z`;
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
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
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
    sortValue: (row) => {
      const series = finiteSparklineValues(spec.values(row));
      if (series.length === 0) return undefined;
      return series.at(-1);
    },
    exportValue: (row) => sparklineExportValue(spec.values(row)),
  };
}

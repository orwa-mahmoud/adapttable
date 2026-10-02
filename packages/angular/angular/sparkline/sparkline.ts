/**
 * Inline sparkline charts — `@adapttable/angular/sparkline`.
 *
 * Bar, line and area, drawn as SVG so a cell never downloads a chart
 * library. The entry is a separate package path: a table that does not
 * import this file never pays for it.
 */
import type { ColumnDef } from "@adapttable/angular";
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
import { Component, computed, input } from "@angular/core";

export type { ColumnDef };
export {
  finiteSparklineValues,
  sparklineExportValue,
  type SparklineKind,
  sparklineSummary,
} from "@adapttable/core";

/** How a sparkline column draws, kept beside the column object. */
interface SparklineDraw<TRow> {
  readonly kind?: SparklineKind;
  readonly width?: number;
  readonly height?: number;
  readonly color?: string;
  readonly label?: (values: readonly number[], row: TRow) => string;
}

const draws = new WeakMap<object, SparklineDraw<unknown>>();

/**
 * Props for {@link AdaptSparkline} when a host draws the chart itself.
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
  header?: string;
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
  /** Extra ColumnDef fields. Accessor, sort, export and the cell win. */
  column?: Partial<ColumnDef<TRow>>;
}

/**
 * A mini chart sized to a cell. Fixed width and height — no observers — so a
 * virtualized row can mount and unmount it without measuring.
 *
 * As a column cell it reads the series from the cell's `value` and the draw
 * options stored for that column. As a standalone chart it reads its inputs.
 *
 * @public
 */
@Component({
  selector: "adapt-sparkline",
  template: `
    <svg
      role="img"
      [attr.aria-label]="summary()"
      [attr.width]="boxWidth()"
      [attr.height]="boxHeight()"
      [attr.viewBox]="'0 0 ' + boxWidth() + ' ' + boxHeight()"
      data-adapttable-part="sparkline"
      [attr.data-kind]="mark()"
      style="display: block; direction: ltr"
    >
      <title>{{ summary() }}</title>
      @switch (mark()) {
        @case ("bar") {
          <g [attr.fill]="ink()">
            @for (bar of bars(); track $index) {
              <rect
                [attr.x]="bar.x"
                [attr.y]="bar.y"
                [attr.width]="bar.width"
                [attr.height]="bar.height"
              />
            }
          </g>
        }
        @case ("area") {
          <path [attr.d]="area()" [attr.fill]="ink()" fill-opacity="0.25" />
          <path
            [attr.d]="line()"
            fill="none"
            [attr.stroke]="ink()"
            stroke-width="1.25"
          />
        }
        @default {
          <path
            [attr.d]="line()"
            fill="none"
            [attr.stroke]="ink()"
            stroke-width="1.25"
          />
        }
      }
    </svg>
  `,
})
export class AdaptSparkline {
  /** The series, when a host draws the chart itself. */
  readonly values = input<readonly number[] | undefined>(undefined);
  /** The cell's accessor value: the series, when this is a column cell. */
  readonly value = input<unknown>(undefined);
  /** The row, when this is a column cell. */
  readonly row = input<unknown>(undefined);
  /** The column, when this is a column cell. */
  readonly column = input<ColumnDef<unknown> | undefined>(undefined);
  /** Which mark to draw. A column's own kind wins. */
  readonly kind = input<SparklineKind>("line");
  /** SVG width. A column's own width wins. */
  readonly width = input(SPARKLINE_DEFAULT_WIDTH);
  /** SVG height. A column's own height wins. */
  readonly height = input(SPARKLINE_DEFAULT_HEIGHT);
  /** Stroke or bar fill. A column's own color wins. */
  readonly color = input("currentColor");
  /** Accessible summary. A column's own label wins, then this. */
  readonly label = input<string | undefined>(undefined);

  private readonly draw = computed(() => draws.get(this.column() ?? {}) ?? {});

  /** The series the host passed, or the cell value when this is a column. */
  private readonly raw = computed((): readonly number[] => {
    const explicit = this.values();
    if (explicit !== undefined) return explicit;
    const value = this.value();
    return Array.isArray(value) ? (value as readonly number[]) : [];
  });

  private readonly series = computed(() => finiteSparklineValues(this.raw()));

  /** The mark actually drawn. */
  protected readonly mark = computed(() => this.draw().kind ?? this.kind());

  /** The box width. */
  protected readonly boxWidth = computed(
    () => this.draw().width ?? this.width()
  );

  /** The box height. */
  protected readonly boxHeight = computed(
    () => this.draw().height ?? this.height()
  );

  /** The stroke or fill. */
  protected readonly ink = computed(() => this.draw().color ?? this.color());

  /** What a screen reader hears. */
  protected readonly summary = computed(() => {
    const values = this.raw();
    const fromColumn = this.draw().label?.(values, this.row());
    return fromColumn ?? this.label() ?? sparklineSummary(values);
  });

  /** Bars for the bar mark. */
  protected readonly bars = computed(() =>
    sparklineBars(this.series(), this.boxWidth(), this.boxHeight())
  );

  /** The line path. */
  protected readonly line = computed(() =>
    sparklineLinePath(this.series(), this.boxWidth(), this.boxHeight())
  );

  /** The area path. */
  protected readonly area = computed(() =>
    sparklineAreaPath(this.series(), this.boxWidth(), this.boxHeight())
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
  const column: ColumnDef<TRow> = {
    ...spec.column,
    key: spec.key,
    header: spec.header ?? spec.column?.header,
    accessor: (row) => spec.values(row),
    cell: AdaptSparkline,
    sortValue: (row) => sparklineSortValue(spec.values(row)),
    exportValue: (row) => sparklineExportValue(spec.values(row)),
  };
  draws.set(column, {
    kind: spec.kind,
    width: spec.width,
    height: spec.height,
    color: spec.color,
    label: spec.label as SparklineDraw<unknown>["label"],
  });
  return column;
}

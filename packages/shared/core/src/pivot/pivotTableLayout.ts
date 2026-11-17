/**
 * A `PivotResult` laid out as an ordinary table: a row-header column, one
 * column per leaf under its header group, the body lines, and the grand total
 * as a column-aligned footer.
 *
 * A binding turns this into its own column definitions; the mapping itself —
 * the column keys, the header groups, the captions, the indent and which line
 * becomes the footer — is decided here once.
 */
import type { DisplayValue } from "../display";
import { PIVOT_LABELS } from "../labelGroups/pivotLabels";
import { resolveFeatureLabels } from "../labelGroups/tableLabels";
import type { TableLabels } from "../types";
import { measureLabel, type PivotField } from "./pivotConfigModel";
import type { PivotColumnLeaf, PivotResult, PivotRow } from "./pivotModel";

const PIVOT_GROUPS = [PIVOT_LABELS] as const;

/**
 * The key of the row-header column — the one down the side, holding each
 * line's label. Stable, so a host can style or address it.
 *
 * @public
 */
export const PIVOT_ROW_COLUMN_KEY = "pivot-row";

/**
 * The key of the column rendering `columnLeaves[index]`.
 *
 * @param index - The leaf's index.
 * @returns The column key.
 *
 * @public
 */
export function pivotLeafColumnKey(index: number): string {
  return `pivot-${String(index)}`;
}

/**
 * The header group a leaf column sits under: its column path, or the
 * grand-total caption for the total column. A total column has no path — it
 * stands for all of them — so it would otherwise land in the gap over
 * ungrouped columns and read as belonging to whatever precedes it.
 *
 * @param leaf - The leaf.
 * @param totalLabel - The grand-total column's group caption.
 * @returns The group path, or `undefined` for an ungrouped column.
 *
 * @public
 */
export function pivotLeafGroup(
  leaf: PivotColumnLeaf,
  totalLabel: string
): readonly string[] | undefined {
  if (leaf.total) return [totalLabel];
  return leaf.path.length > 0 ? leaf.path : undefined;
}

/**
 * A line's own caption, as text: its label, or the grand-total wording.
 *
 * @param row - The line.
 * @param labels - Resolved labels.
 * @returns The caption.
 *
 * @public
 */
export function pivotRowCaption(
  row: PivotRow,
  labels: Pick<Required<TableLabels>, "pivotGrandTotal">
): string {
  return row.kind === "grandTotal" ? labels.pivotGrandTotal : row.label;
}

/**
 * The inline-start padding that shows a line's nesting, or `undefined` at the
 * top level or with no indent.
 *
 * @param row - The line.
 * @param indent - Pixels per nesting level.
 * @returns The style.
 *
 * @public
 */
export function pivotRowIndentStyle(
  row: PivotRow,
  indent: number
): { paddingInlineStart: string } | undefined {
  return row.depth > 0 && indent > 0
    ? { paddingInlineStart: `${String(row.depth * indent)}px` }
    : undefined;
}

/**
 * The pixels of indent per nesting level unless the host says otherwise.
 *
 * @public
 */
export const PIVOT_ROW_INDENT = 16;

/**
 * One leaf column of the laid-out pivot.
 *
 * @public
 */
export interface PivotLeafColumnLayout {
  /** The column key. */
  readonly key: string;
  /** Its index in `columnLeaves` and in every line's `cells`. */
  readonly index: number;
  /** The measure caption. */
  readonly header: string;
  /** The header group. */
  readonly group: readonly string[] | undefined;
  /** The leaf itself. */
  readonly leaf: PivotColumnLeaf;
}

/**
 * A pivot laid out as a table.
 *
 * @public
 */
export interface PivotTableLayout {
  /** The row-header column's default header. */
  readonly rowHeaderLabel: string;
  /** One column per leaf, in order. */
  readonly leafColumns: readonly PivotLeafColumnLayout[];
  /** Every line except the grand total, which is the footer instead. */
  readonly rows: readonly PivotRow[];
  /** The grand-total line, or `undefined` without grand totals. */
  readonly grandTotal: PivotRow | undefined;
  /**
   * The footer's cells by column key — the row-header caption and each leaf's
   * value — or `undefined` without a grand total.
   */
  readonly summaryCells:
    Readonly<Record<string, DisplayValue | undefined>> | undefined;
}

/**
 * Lay a pivot out as a table.
 *
 * @param result - What `pivot` (or `serverPivotResult`) returned.
 * @param options - The fields for the measure captions, and the labels.
 * @returns The layout.
 *
 * @public
 */
export function pivotTableLayout(
  result: PivotResult,
  options: {
    readonly fields?: readonly PivotField[];
    readonly labels?: TableLabels;
  } = {}
): PivotTableLayout {
  const fields = options.fields ?? [];
  const labels = resolveFeatureLabels(options.labels, PIVOT_GROUPS);
  const grandTotal = result.rows.find((row) => row.kind === "grandTotal");
  return {
    rowHeaderLabel: labels.pivotRows,
    leafColumns: result.columnLeaves.map((leaf, index) => ({
      key: pivotLeafColumnKey(index),
      index,
      header: measureLabel(leaf.measure, fields),
      group: pivotLeafGroup(leaf, labels.pivotTotal),
      leaf,
    })),
    rows: grandTotal
      ? result.rows.filter((row) => row.kind !== "grandTotal")
      : result.rows,
    grandTotal,
    // The footer's caption is the label, never a host's row-header renderer:
    // a fold control on the grand total would be a button with nothing to
    // fold.
    summaryCells: grandTotal
      ? {
          [PIVOT_ROW_COLUMN_KEY]: pivotRowCaption(grandTotal, labels),
          ...Object.fromEntries(
            grandTotal.cells.map((cell, index) => [
              pivotLeafColumnKey(index),
              cell,
            ])
          ),
        }
      : undefined,
  };
}

import type { CSSProperties } from "react";

import type { ColumnDef } from "../types";

/**
 * Pixel lock for a collapsed arrow stub — chevron only, no leftover strip.
 *
 * @public
 */
export const COLUMN_GROUP_STUB_WIDTH = 36;

/**
 * Path separator inside a column-group id — labels may contain `/`.
 *
 * @public
 */
export const COLUMN_GROUP_ID_SEP = "\u001f";

/**
 * Synthetic leaf shown when a collapsed group has no summary column.
 *
 * @public
 */
export const COLUMN_GROUP_STUB_PREFIX = "__groupStub:";

/**
 * Synthetic leaf shown when a collapsed group uses `collapsedRender`.
 *
 * @public
 */
export const COLUMN_GROUP_RENDER_PREFIX = "__groupRender:";

/**
 * True when this key is a collapsed-group arrow stub.
 *
 * @public
 */
export function isColumnGroupStubKey(key: string): boolean {
  return key.startsWith(COLUMN_GROUP_STUB_PREFIX);
}

/**
 * True when this key is a collapsed-group `collapsedRender` column.
 *
 * @public
 */
export function isColumnGroupRenderKey(key: string): boolean {
  return key.startsWith(COLUMN_GROUP_RENDER_PREFIX);
}

/**
 * True when this key is a stub or `collapsedRender` summary leaf.
 *
 * @public
 */
export function isColumnGroupSummaryKey(key: string): boolean {
  return isColumnGroupStubKey(key) || isColumnGroupRenderKey(key);
}

/**
 * Inset hairline under a group title that still has child headers below.
 * Stops Assignment and Delivery sharing one stroke across the gap.
 *
 * @public
 */
export function groupedHeaderChildRule(hairline: string): {
  readonly borderBottom: string;
  readonly backgroundImage: string;
  readonly backgroundPosition: string;
  readonly backgroundRepeat: string;
  readonly backgroundSize: string;
} {
  return {
    borderBottom: "none",
    backgroundImage: `linear-gradient(${hairline}, ${hairline})`,
    backgroundPosition: "center bottom",
    backgroundRepeat: "no-repeat",
    backgroundSize: "calc(100% - 12px) 1px",
  };
}

/**
 * One cell of a group header row.
 *
 * @public
 */
export interface HeaderGroupCell {
  /** Stable key for React lists. */
  key: string;
  /** Group label, or `null` for the gap over ungrouped columns. */
  label: string | null;
  /** How many leaf columns this cell spans. */
  span: number;
  /**
   * Stable id of this group (`path.join(COLUMN_GROUP_ID_SEP)`).
   * `null` on a gap cell.
   */
  id: string | null;
  /** True when this group is collapsed. */
  collapsed: boolean;
  /** True when the host armed collapse and this cell is a real group. */
  collapsible: boolean;
  /**
   * Hide the visible caption (collapsed arrow stub). The name stays on
   * the toggle's accessible label.
   */
  hideLabel: boolean;
  /**
   * Header alignment. Omit and {@link groupedHeaderAlign} uses `"center"`,
   * the previous hardcoded value.
   */
  align?: GroupedHeaderAlign;
}

/**
 * Alignment of a spanning group header.
 *
 * @public
 */
export type GroupedHeaderAlign = "start" | "center" | "end";

/**
 * Size lock for a collapsed arrow-stub column. `width` alone is a hint in
 * auto table layout; min + max stop the table from stretching the blank
 * strip to a data-column width.
 *
 * @public
 */
export function columnGroupStubStyle(): CSSProperties {
  return {
    width: COLUMN_GROUP_STUB_WIDTH,
    minWidth: COLUMN_GROUP_STUB_WIDTH,
    maxWidth: COLUMN_GROUP_STUB_WIDTH,
    paddingInline: 0,
    overflow: "hidden",
    boxSizing: "border-box",
  };
}

/**
 * Alignment for a group header. Omit / unknown → `"center"`, so existing
 * tables keep the hardcoded look; pass `"start"` or `"end"` to opt out.
 *
 * @public
 */
export function groupedHeaderAlign(
  align?: GroupedHeaderAlign
): GroupedHeaderAlign {
  if (align === "start" || align === "end") return align;
  return "center";
}

/**
 * Cluster for the collapse chevron + group title. A one-child group is only
 * as wide as that leaf, so without this the button wraps onto the line above
 * the caption — worst when every neighbor is also collapsed.
 *
 * @public
 */
export function groupedHeaderLabelStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.2em",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
    maxWidth: "100%",
  };
}

/**
 * Style on one HTML group header cell: inset hairline while children sit
 * below, and the stub lock when the caption is hidden.
 *
 * @public
 */
export function groupedHeaderCellStyle(
  cell: Readonly<{ rowSpan: number; cell: HeaderGroupCell }>,
  hairline: string
): CSSProperties {
  return {
    textAlign: groupedHeaderAlign(cell.cell.align),
    whiteSpace: "nowrap",
    ...(cell.rowSpan > 1 ? {} : groupedHeaderChildRule(hairline)),
    ...(cell.cell.hideLabel
      ? columnGroupStubStyle()
      : { minWidth: "max-content" }),
  };
}

/**
 * `column.group` as a root-to-leaf path. A string is one level.
 *
 * @public
 */
export function columnGroupPath<TRow>(
  column: Pick<ColumnDef<TRow>, "group">
): readonly string[] {
  if (column.group === undefined) return [];
  return typeof column.group === "string" ? [column.group] : column.group;
}

/**
 * Stable id for a group path.
 *
 * @public
 */
export function columnGroupId(path: readonly string[]): string {
  return path.join(COLUMN_GROUP_ID_SEP);
}

/**
 * Add or drop a group id in the collapsed set.
 *
 * @public
 */
export function toggleCollapsedColumnGroup(
  collapsedIds: readonly string[],
  id: string
): string[] {
  return collapsedIds.includes(id)
    ? collapsedIds.filter((one) => one !== id)
    : [...collapsedIds, id];
}

/**
 * Every group-header row, top level first. Returns `null` when no visible
 * column declares a group. Contiguous same-path cells merge; a reorder that
 * breaks adjacency splits the group rather than teleporting it.
 *
 * @public
 */
export function headerGroupRows<TRow>(
  columns: readonly ColumnDef<TRow>[],
  collapsedIds: readonly string[] = [],
  collapsible = false,
  groups?: ReadonlyMap<string, { readonly align?: GroupedHeaderAlign }>
): HeaderGroupCell[][] | null {
  const paths = columns.map((column) => columnGroupPath(column));
  const maxDepth = paths.reduce((max, path) => Math.max(max, path.length), 0);
  if (maxDepth === 0) return null;
  const collapsed = new Set(collapsedIds);
  const rows: HeaderGroupCell[][] = [];
  for (let depth = 0; depth < maxDepth; depth += 1) {
    rows.push(
      headerGroupRowAt(columns, paths, collapsed, collapsible, depth, groups)
    );
  }
  return rows;
}

function headerGroupRowAt<TRow>(
  columns: readonly ColumnDef<TRow>[],
  paths: readonly (readonly string[])[],
  collapsed: ReadonlySet<string>,
  collapsible: boolean,
  depth: number,
  groups?: ReadonlyMap<string, { readonly align?: GroupedHeaderAlign }>
): HeaderGroupCell[] {
  const cells: HeaderGroupCell[] = [];
  for (let index = 0; index < columns.length; index += 1) {
    const path = paths[index] ?? [];
    const label = path[depth] ?? null;
    const id = label === null ? null : columnGroupId(path.slice(0, depth + 1));
    const last = cells.at(-1);
    const stub = isColumnGroupStubKey(columns[index]?.key ?? "");
    if (last?.label === label && last.id === id) {
      last.span += 1;
      if (!stub) last.hideLabel = false;
      continue;
    }
    const collapsedHere = id !== null && collapsed.has(id);
    cells.push({
      key: `${id ?? "gap"}-${depth}-${cells.length}`,
      label,
      span: 1,
      id,
      collapsed: collapsedHere,
      collapsible: collapsible && id !== null,
      hideLabel: collapsedHere && stub,
      align: id === null ? undefined : groups?.get(id)?.align,
    });
  }
  return cells;
}

/**
 * The top group-header row. `null` when no visible column declares a group.
 * Groups are adjacency-based — if the user reorders columns apart, the
 * group SPLITS rather than lying about the layout.
 *
 * @public
 */
export function headerGroupRow<TRow>(
  columns: readonly ColumnDef<TRow>[]
): HeaderGroupCell[] | null {
  return headerGroupRows(columns)?.[0] ?? null;
}

/**
 * Visible group caption; `null` when the collapsed stub hides the name.
 *
 * @public
 */
export function columnGroupHeaderCaption(cell: HeaderGroupCell): string | null {
  if (cell.hideLabel) return null;
  return cell.label;
}

/**
 * One cell in {@link htmlGroupedHeaderPlan}. Group cells span children
 * horizontally; leaf cells rowspan through the group band so an ungrouped
 * Person sits beside Delivery and its children — Ant's nested header, on
 * an HTML table. A collapsed `collapsedRender` / stub group rowspans the
 * same way: no second header row, no line under the title. `collapsedKey`
 * keeps the child header, so that group stays two rows.
 *
 * @public
 */
export type HtmlGroupedHeaderCell =
  | {
      readonly kind: "group";
      readonly key: string;
      readonly colSpan: number;
      readonly rowSpan: number;
      readonly cell: HeaderGroupCell;
    }
  | {
      readonly kind: "leaf";
      readonly key: string;
      readonly columnIndex: number;
      readonly rowSpan: number;
    };

/**
 * Header rows for HTML-table kits. `null` when no column declares a group.
 * Ant folds the same model into native `children`; this plan is that tree
 * flattened into `rowSpan` / `colSpan` so Mantine, MUI, and the rest match.
 *
 * @public
 */
export function htmlGroupedHeaderPlan<TRow>(
  columns: readonly ColumnDef<TRow>[],
  collapsedIds: readonly string[] = [],
  collapsible = false,
  groups?: ReadonlyMap<string, { readonly align?: GroupedHeaderAlign }>
): HtmlGroupedHeaderCell[][] | null {
  const groupRows = headerGroupRows(columns, collapsedIds, collapsible, groups);
  if (!groupRows) return null;
  const depth = groupRows.length;
  const paths = columns.map((column) => columnGroupPath(column));
  const totalRows =
    depth + (needsChildHeaderRow(columns, paths, depth) ? 1 : 0);
  const plan: HtmlGroupedHeaderCell[][] = Array.from(
    { length: totalRows },
    () => []
  );
  fillGroupLevels(plan, groupRows, columns, paths, totalRows, depth);
  if (totalRows > depth) fillChildHeaderRow(plan, columns, paths, depth);
  return plan;
}

function needsChildHeaderRow<TRow>(
  columns: readonly ColumnDef<TRow>[],
  paths: readonly (readonly string[])[],
  depth: number
): boolean {
  return columns.some((column, index) => {
    if ((paths[index]?.length ?? 0) !== depth) return false;
    return !isColumnGroupSummaryKey(column.key);
  });
}

function fillGroupLevels<TRow>(
  plan: HtmlGroupedHeaderCell[][],
  groupRows: HeaderGroupCell[][],
  columns: readonly ColumnDef<TRow>[],
  paths: readonly (readonly string[])[],
  totalRows: number,
  depth: number
): void {
  for (let level = 0; level < depth; level += 1) {
    let col = 0;
    for (const cell of groupRows[level] ?? []) {
      if (cell.label === null) {
        col = fillGapLeaves(
          plan,
          columns,
          paths,
          col,
          cell.span,
          level,
          totalRows
        );
        continue;
      }
      const summary = spanIsSummaryOnly(columns, col, cell.span);
      plan[level]?.push({
        kind: "group",
        key: cell.key,
        colSpan: cell.span,
        rowSpan: summary ? totalRows - level : 1,
        cell,
      });
      col += cell.span;
    }
  }
}

function fillGapLeaves<TRow>(
  plan: HtmlGroupedHeaderCell[][],
  columns: readonly ColumnDef<TRow>[],
  paths: readonly (readonly string[])[],
  start: number,
  span: number,
  level: number,
  totalRows: number
): number {
  let col = start;
  for (let step = 0; step < span; step += 1) {
    const pathLen = paths[col]?.length ?? 0;
    const column = columns[col];
    if (pathLen === level && column) {
      plan[level]?.push({
        kind: "leaf",
        key: column.key,
        columnIndex: col,
        rowSpan: totalRows - level,
      });
    }
    col += 1;
  }
  return col;
}

function fillChildHeaderRow<TRow>(
  plan: HtmlGroupedHeaderCell[][],
  columns: readonly ColumnDef<TRow>[],
  paths: readonly (readonly string[])[],
  depth: number
): void {
  for (let index = 0; index < columns.length; index += 1) {
    const column = columns[index];
    if (!column) continue;
    if ((paths[index]?.length ?? 0) !== depth) continue;
    if (isColumnGroupSummaryKey(column.key)) continue;
    plan[depth]?.push({
      kind: "leaf",
      key: column.key,
      columnIndex: index,
      rowSpan: 1,
    });
  }
}

function spanIsSummaryOnly<TRow>(
  columns: readonly ColumnDef<TRow>[],
  start: number,
  span: number
): boolean {
  if (span <= 0) return false;
  for (let step = 0; step < span; step += 1) {
    const column = columns[start + step];
    if (!column || !isColumnGroupSummaryKey(column.key)) return false;
  }
  return true;
}

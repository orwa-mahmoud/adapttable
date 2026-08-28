/**
 * Full-width and separator rows — host-injected slots between data rows.
 *
 * Grouping already speaks in `kind`s. These two join that vocabulary so a
 * kit maps one list: a separator is a thin rule, a full-width row is one
 * cell spanning the table. Omit `extraRows` and nothing is inserted.
 *
 * Position is `beforeRowId` (a data-row id). Omit it to append after the
 * last data row. Several extras sharing a target keep the host's order.
 * A named extra stays in front of that person through reorder and pin —
 * pin sections splice extras whose `beforeRowId` is in that section.
 *
 * Extras are content, not table state — nothing goes in the URL. Mobile
 * cards keep the same slots: a rule between cards, or a full-width note.
 */
import type { CSSProperties, ReactNode } from "react";

import { PIN_Z } from "../columns/useColumnLayout";
import { resolveRowStyle, type RowStyle } from "./rowStyle";

/**
 * What the host may inject.
 *
 * @public
 */
export type ExtraRowKind = "separator" | "fullWidth";

/**
 * One host-injected slot.
 *
 * @public
 */
export interface ExtraRow {
  /** Stable id — also the React key. */
  key: string;
  /** Discriminant for the union. */
  kind: ExtraRowKind;
  /**
   * Insert immediately before this data row. Omit to append after the
   * last data row in the list being interleaved.
   */
  beforeRowId?: string;
  /** Full-width body. Ignored on a separator. */
  render?: () => ReactNode;
}

/**
 * A separator or full-width entry in a `kind`-tagged body list.
 *
 * @internal
 */
export type ExtraEntry =
  | { kind: "separator"; key: string }
  | { kind: "fullWidth"; key: string; render?: () => ReactNode };

/**
 * Narrow a body slot to a host-injected extra.
 *
 * @internal
 */
export function isExtraEntry(entry: object): entry is ExtraEntry {
  if (!("kind" in entry)) return false;
  const kind = (entry as { kind?: unknown }).kind;
  return kind === "separator" || kind === "fullWidth";
}

/**
 * True when the host asked for any extra slot.
 *
 * @internal
 */
export function extraRowsArmed(
  extraRows: readonly ExtraRow[] | undefined
): boolean {
  return Boolean(extraRows && extraRows.length > 0);
}

function toEntry(extra: ExtraRow): ExtraEntry {
  if (extra.kind === "separator") return { kind: "separator", key: extra.key };
  return { kind: "fullWidth", key: extra.key, render: extra.render };
}

/**
 * Splice extras into a `kind`-tagged list. `dataKey` names the data row
 * an entry represents — group headers return `undefined` and are never
 * a splice target.
 *
 * @internal
 */
export function insertExtraRows<T extends { key: string }>(
  entries: readonly T[],
  extraRows: readonly ExtraRow[] | undefined,
  dataKey: (entry: T) => string | undefined
): readonly (T | ExtraEntry)[] {
  if (!extraRows || extraRows.length === 0) return entries;
  const before = new Map<string, ExtraRow[]>();
  const append: ExtraRow[] = [];
  for (const extra of extraRows) {
    if (extra.beforeRowId === undefined) {
      append.push(extra);
      continue;
    }
    const bucket = before.get(extra.beforeRowId) ?? [];
    bucket.push(extra);
    before.set(extra.beforeRowId, bucket);
  }
  const result: (T | ExtraEntry)[] = [];
  for (const entry of entries) {
    const id = dataKey(entry);
    if (id !== undefined) {
      const waiting = before.get(id);
      if (waiting) {
        for (const extra of waiting) result.push(toEntry(extra));
        before.delete(id);
      }
    }
    result.push(entry);
  }
  for (const extra of append) result.push(toEntry(extra));
  return result;
}

/**
 * Extras whose `beforeRowId` sits in this section. Untargeted extras
 * (no `beforeRowId`) are included only when `appendUntargeted` is true —
 * those still belong at the end of the scroll body, not in a pin section.
 *
 * @internal
 */
export function extraRowsForSection(
  extraRows: readonly ExtraRow[] | undefined,
  rowIds: ReadonlySet<string>,
  appendUntargeted = false
): readonly ExtraRow[] | undefined {
  if (!extraRows || extraRows.length === 0) return extraRows;
  const next = extraRows.filter((extra) => {
    if (extra.beforeRowId === undefined) return appendUntargeted;
    return rowIds.has(extra.beforeRowId);
  });
  return next.length === 0 ? undefined : next;
}

/**
 * Splice extras whose `beforeRowId` is in this row list. Use on a pin
 * section so a named extra stays in front of a pinned person.
 *
 * @internal
 */
export function insertExtrasBeforeRows<TRow>(
  rows: readonly TRow[],
  extraRows: readonly ExtraRow[] | undefined,
  getRowId: (row: TRow) => string
): readonly ({ key: string; row: TRow } | ExtraEntry)[] {
  const ids = new Set(rows.map(getRowId));
  return insertExtraRows(
    rows.map((row) => ({ key: getRowId(row), row })),
    extraRowsForSection(extraRows, ids),
    (entry) => entry.key
  );
}

/**
 * Lift an extra row above a continuing Team span so the note is not hidden
 * under it. Padding is the extra's own height — it is not folded into the
 * person below. Fill comes from that person's `rowStyle` (see
 * {@link extraHostFillStyle}); AdaptTable does not pick a colour.
 *
 * @internal
 */
export const EXTRA_OVER_SPAN_ROW_STYLE: CSSProperties = {
  position: "relative",
  zIndex: PIN_Z.rowPinned,
};

/**
 * Cell paint for an extra: RTL-safe align, and room for a line of text.
 *
 * @internal
 */
export const EXTRA_OVER_SPAN_STYLE: CSSProperties = {
  textAlign: "start",
  paddingBlock: "0.75rem",
  paddingInline: "0.75rem",
};

/**
 * The fill the host already passed for this extra's person. Height is not
 * copied — extras size from their own padding, not `rowHeight`.
 *
 * @internal
 */
export function extraHostFillStyle<TRow>(
  extraKey: string,
  extraRows: readonly ExtraRow[] | undefined,
  rows: readonly TRow[],
  getRowId: (row: TRow) => string,
  rowStyle: RowStyle<TRow> | undefined
): CSSProperties | undefined {
  const extra = extraRows?.find((item) => item.key === extraKey);
  if (!extra?.beforeRowId) return undefined;
  const index = rows.findIndex((row) => getRowId(row) === extra.beforeRowId);
  if (index < 0) return undefined;
  const visual = resolveRowStyle(rowStyle, undefined, rows[index]!, index);
  if (!visual) return undefined;
  const fill: CSSProperties = {};
  if (visual.backgroundColor !== undefined) {
    fill.backgroundColor = visual.backgroundColor;
  }
  if (visual.background !== undefined) fill.background = visual.background;
  return Object.keys(fill).length > 0 ? fill : undefined;
}

/**
 * Part names every kit stamps on an extra row.
 *
 * @internal
 */
export const EXTRA_ROW_PARTS = {
  separator: { row: "separator-row", cell: "separator-cell" },
  fullWidth: { row: "full-width-row", cell: "full-width-cell" },
} as const;

/**
 * How many extras sit immediately in front of any of these data-row ids.
 *
 * @internal
 */
export function extraCountBeforeRowIds(
  extraRows: readonly ExtraRow[] | undefined,
  ids: ReadonlySet<string>
): number {
  if (!extraRows || extraRows.length === 0 || ids.size === 0) return 0;
  let count = 0;
  for (const extra of extraRows) {
    if (extra.beforeRowId !== undefined && ids.has(extra.beforeRowId)) {
      count += 1;
    }
  }
  return count;
}

/**
 * Grow a data-row `rowSpan` so it still reaches the last covered person
 * after extras in front of those people take `<tr>` slots.
 *
 * @internal
 */
export function inflateBodyCellRowSpans<
  TCell extends { columnIndex: number; colSpan: number; rowSpan: number },
>(
  cellsByRow: ReadonlyMap<string, readonly TCell[]>,
  visualIds: readonly string[],
  extraRows: readonly ExtraRow[] | undefined
): ReadonlyMap<string, readonly TCell[]> {
  if (!extraRows?.length) return cellsByRow;
  const indexOf = new Map(visualIds.map((id, index) => [id, index] as const));
  const next = new Map<string, readonly TCell[]>();
  for (const [id, cells] of cellsByRow) {
    const origin = indexOf.get(id);
    if (origin === undefined) {
      next.set(id, cells);
      continue;
    }
    let changed = false;
    const updated = cells.map((cell) => {
      if (cell.rowSpan <= 1) return cell;
      const extraCount = extraCountBeforeRowIds(
        extraRows,
        new Set(visualIds.slice(origin + 1, origin + cell.rowSpan))
      );
      if (extraCount === 0) return cell;
      changed = true;
      return { ...cell, rowSpan: cell.rowSpan + extraCount };
    });
    next.set(id, changed ? updated : cells);
  }
  return next;
}

type VisualSlot =
  { kind: "extra"; beforeId: string } | { kind: "row"; id: string };

function visualBodySlots(
  visualIds: readonly string[],
  extraRows: readonly ExtraRow[] | undefined
): readonly VisualSlot[] {
  const buckets = new Map<string, ExtraRow[]>();
  for (const extra of extraRows ?? []) {
    if (extra.beforeRowId === undefined) continue;
    const list = buckets.get(extra.beforeRowId) ?? [];
    list.push(extra);
    buckets.set(extra.beforeRowId, list);
  }
  const slots: VisualSlot[] = [];
  for (const id of visualIds) {
    for (const extra of buckets.get(id) ?? []) {
      slots.push({ kind: "extra", beforeId: extra.beforeRowId ?? id });
    }
    slots.push({ kind: "row", id });
  }
  return slots;
}

function visualSlotIndexes(
  slots: readonly VisualSlot[],
  beforeRowId: string
): { extraIndexes: number[]; rowSlotIndex: Map<string, number> } {
  const extraIndexes: number[] = [];
  const rowSlotIndex = new Map<string, number>();
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index]!;
    if (slot.kind === "extra" && slot.beforeId === beforeRowId) {
      extraIndexes.push(index);
    }
    if (slot.kind === "row") rowSlotIndex.set(slot.id, index);
  }
  return { extraIndexes, rowSlotIndex };
}

function coverContinuingSpans(
  cellsByRow: ReadonlyMap<
    string,
    readonly { columnIndex: number; colSpan: number; rowSpan: number }[]
  >,
  extraIndexes: number[],
  rowSlotIndex: Map<string, number>,
  leadingCells: number,
  covered: Set<number>
): void {
  for (const [id, cells] of cellsByRow) {
    const start = rowSlotIndex.get(id);
    if (start === undefined) continue;
    for (const cell of cells) {
      addSpanCoverage(cell, start, extraIndexes, leadingCells, covered);
    }
  }
}

function addSpanCoverage(
  cell: { columnIndex: number; colSpan: number; rowSpan: number },
  start: number,
  extraIndexes: number[],
  leadingCells: number,
  covered: Set<number>
): void {
  if (cell.rowSpan <= 1) return;
  const end = start + cell.rowSpan;
  for (const extraIndex of extraIndexes) {
    if (extraIndex <= start || extraIndex >= end) continue;
    for (let offset = 0; offset < cell.colSpan; offset += 1) {
      covered.add(leadingCells + cell.columnIndex + offset);
    }
  }
}

/**
 * Table-slot indexes (leading chrome + data columns) a continuing row span
 * already owns on extras in front of this person — those extras omit a `<td>`
 * there so the merge can keep going.
 *
 * @internal
 */
export function extraCoveredTableSlots(
  beforeRowId: string,
  options: {
    visualIds: readonly string[];
    cellsByRow: ReadonlyMap<
      string,
      readonly { columnIndex: number; colSpan: number; rowSpan: number }[]
    >;
    extraRows?: readonly ExtraRow[];
    leadingCells: number;
  }
): ReadonlySet<number> {
  const { visualIds, cellsByRow, extraRows, leadingCells } = options;
  const covered = new Set<number>();
  const { extraIndexes, rowSlotIndex } = visualSlotIndexes(
    visualBodySlots(visualIds, extraRows),
    beforeRowId
  );
  if (extraIndexes.length === 0) return covered;
  coverContinuingSpans(
    cellsByRow,
    extraIndexes,
    rowSlotIndex,
    leadingCells,
    covered
  );
  return covered;
}

/**
 * Uncovered colSpans for an extra row that has to leave holes for a row span.
 *
 * @internal
 */
export function extraUncoveredColSpans(
  columnSpan: number,
  coveredSlots: ReadonlySet<number> | undefined
): readonly number[] {
  if (!coveredSlots || coveredSlots.size === 0) return [columnSpan];
  const spans: number[] = [];
  let index = 0;
  while (index < columnSpan) {
    if (coveredSlots.has(index)) {
      index += 1;
      continue;
    }
    let span = 1;
    while (index + span < columnSpan && !coveredSlots.has(index + span)) {
      span += 1;
    }
    spans.push(span);
    index += span;
  }
  return spans.length === 0 ? [columnSpan] : spans;
}

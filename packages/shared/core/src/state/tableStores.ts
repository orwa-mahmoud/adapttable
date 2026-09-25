/**
 * The per-domain rules the table's controllable stores apply: selection,
 * expansion, collapsed groups, pinned rows and column layout. Each is a pure
 * transition from the current value to the next, so every binding commits
 * the same change through {@link createControllableStore}.
 */
import {
  type ColumnLayoutState,
  EMPTY_COLUMN_LAYOUT,
  type PinSide,
} from "../columns/columnLayoutModel";
import type { RowPinSide, RowPinState } from "../rows/rowPinModel";
import type { HeaderSelectionState } from "../selection/selectionState";
import { devWarn } from "../utils/devWarn";
import { memoLast } from "../utils/memoLast";

/* ── Id sets: selection, expansion, collapsed groups ───────────────── */

/**
 * The set with `id` flipped: removed when present, added when not.
 *
 * @public
 */
export function toggleId(set: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/**
 * The set with every id in `ids` flipped as one: all removed when every one
 * is present, else the missing ones added.
 *
 * @public
 */
export function toggleIds(
  set: ReadonlySet<string>,
  ids: readonly string[]
): Set<string> {
  const next = new Set(set);
  const allPresent = ids.length > 0 && ids.every((id) => next.has(id));
  for (const id of ids) {
    if (allPresent) next.delete(id);
    else next.add(id);
  }
  return next;
}

/**
 * A reader that turns a controlled id list into a set, keeping the set while
 * the list is the same array.
 *
 * @public
 */
export function idSetReader(): (
  ids: readonly string[] | undefined
) => ReadonlySet<string> | undefined {
  return memoLast((ids: readonly string[] | undefined) =>
    ids === undefined ? undefined : new Set(ids)
  );
}

/**
 * The tri-state a select-all control shows for the visible rows.
 *
 * @public
 */
export function headerSelectionOf(
  visibleIds: readonly string[],
  selected: ReadonlySet<string>
): HeaderSelectionState {
  const selectedVisible = visibleIds.reduce(
    (count, id) => (selected.has(id) ? count + 1 : count),
    0
  );
  if (visibleIds.length > 0 && selectedVisible === visibleIds.length) {
    return "all";
  }
  return selectedVisible > 0 ? "some" : "none";
}

/**
 * Whether to offer "select all N matching": the source can answer for rows
 * past the page, every visible row is selected, and there are more.
 *
 * @public
 */
export function offersAllMatching(
  selection: {
    readonly acrossPages: boolean;
    readonly headerState: HeaderSelectionState;
    readonly visibleIds: readonly string[];
  },
  total: number
): boolean {
  return (
    selection.acrossPages &&
    selection.headerState === "all" &&
    total > selection.visibleIds.length
  );
}

/**
 * The groups to collapse so the tree shows down to `depth` and no further:
 * every group at that depth or deeper. Depth 0 collapses the top level.
 *
 * @public
 */
export function groupsCollapsedToDepth(
  groups: readonly { readonly key: string; readonly level: number }[],
  depth: number
): Set<string> {
  return new Set(
    groups.filter((group) => group.level >= depth).map((group) => group.key)
  );
}

/* ── Pinned rows ───────────────────────────────────────────────────── */

function withoutId(ids: readonly string[], rowId: string): string[] {
  return ids.filter((id) => id !== rowId);
}

function withId(ids: readonly string[], rowId: string): string[] {
  return ids.includes(rowId) ? [...ids] : [...ids, rowId];
}

/**
 * Pin a row to an edge — moving it off the other — or unpin it with
 * `undefined`.
 *
 * @public
 */
export function applyRowPin(
  state: RowPinState,
  rowId: string,
  side: RowPinSide | undefined
): RowPinState {
  const top = withoutId(state.top, rowId);
  const bottom = withoutId(state.bottom, rowId);
  if (side === "top") return { top: withId(top, rowId), bottom };
  if (side === "bottom") return { top, bottom: withId(bottom, rowId) };
  return { top, bottom };
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((id, index) => id === right[index])
  );
}

/**
 * Whether two pin states hold the same rows in the same order.
 *
 * @public
 */
export function sameRowPins(left: RowPinState, right: RowPinState): boolean {
  return sameIds(left.top, right.top) && sameIds(left.bottom, right.bottom);
}

/**
 * The edge a row is pinned to, if any.
 *
 * @public
 */
export function rowPinSideOf(
  state: RowPinState,
  rowId: string
): RowPinSide | undefined {
  if (state.top.includes(rowId)) return "top";
  if (state.bottom.includes(rowId)) return "bottom";
  return undefined;
}

/* ── Column layout ─────────────────────────────────────────────────── */

/**
 * The layout with a column hidden or shown. The same layout when nothing
 * changes.
 *
 * @public
 */
export function withColumnHidden(
  state: ColumnLayoutState,
  key: string,
  hidden: boolean
): ColumnLayoutState {
  if (state.hidden.includes(key) === hidden) return state;
  return {
    ...state,
    hidden: hidden
      ? [...state.hidden, key]
      : state.hidden.filter((candidate) => candidate !== key),
  };
}

/**
 * The layout with a column pinned to an edge, or unpinned with `undefined`.
 *
 * @public
 */
export function withColumnPinned(
  state: ColumnLayoutState,
  key: string,
  side: PinSide | undefined
): ColumnLayoutState {
  const pinned = { ...state.pinned };
  if (side === undefined) delete pinned[key];
  else pinned[key] = side;
  return { ...state, pinned };
}

/**
 * The layout with a column's width set, or reset with `undefined`.
 *
 * @public
 */
export function withColumnWidth(
  state: ColumnLayoutState,
  key: string,
  width: number | undefined
): ColumnLayoutState {
  const widths = { ...state.widths };
  if (width === undefined) delete widths[key];
  else widths[key] = width;
  return { ...state, widths };
}

/**
 * The layout with a column moved to `toIndex` in `order` — the full current
 * order, hidden columns included — or `undefined` when the move changes
 * nothing, names an unknown column, or breaks what `holds` requires of an
 * order (a column group's members staying together).
 *
 * @public
 */
export function withColumnMoved(
  state: ColumnLayoutState,
  order: readonly string[],
  key: string,
  toIndex: number,
  holds: (order: readonly string[]) => boolean = () => true
): ColumnLayoutState | undefined {
  const next = [...order];
  const from = next.indexOf(key);
  if (from === -1) return undefined;
  const clamped = Math.max(0, Math.min(toIndex, next.length - 1));
  if (from === clamped) return undefined;
  next.splice(from, 1);
  next.splice(clamped, 0, key);
  if (!holds(next)) return undefined;
  return { ...state, order: next };
}

/**
 * The layout with a whole new order, or `undefined` when `order` is not a
 * permutation of `current` or breaks what `holds` requires.
 *
 * @public
 */
export function withColumnOrder(
  state: ColumnLayoutState,
  current: readonly string[],
  order: readonly string[],
  holds: (order: readonly string[]) => boolean = () => true
): ColumnLayoutState | undefined {
  if (order.length !== current.length) return undefined;
  const unique = new Set(order);
  if (
    unique.size !== current.length ||
    !current.every((key) => unique.has(key))
  ) {
    return undefined;
  }
  const next = [...order];
  if (!holds(next)) return undefined;
  return { ...state, order: next };
}

/* ── Stored column layout ──────────────────────────────────────────── */

/**
 * The storage a column layout persists to — `localStorage` by default.
 *
 * @public
 */
export type LayoutStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Keep only string entries of a (possibly hostile) stored array. */
function stringEntries(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

/** A non-null, non-array object — the only shape worth field-scanning. */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Keep only valid pin sides of a (possibly hostile) stored record. */
function sanitizePinned(value: unknown): Record<string, PinSide> {
  const pinned: Record<string, PinSide> = {};
  if (!isPlainRecord(value)) return pinned;
  for (const [key, side] of Object.entries(value)) {
    if (side === "start" || side === "end") pinned[key] = side;
  }
  return pinned;
}

/** Keep only finite positive widths of a (possibly hostile) stored record. */
function sanitizeWidths(value: unknown): Record<string, number> {
  const widths: Record<string, number> = {};
  if (!isPlainRecord(value)) return widths;
  for (const [key, px] of Object.entries(value)) {
    if (typeof px === "number" && Number.isFinite(px) && px > 0) {
      widths[key] = px;
    }
  }
  return widths;
}

/** Keep only non-empty string names from a (possibly hostile) stored record. */
function sanitizeNames(value: unknown): Record<string, string> {
  const names: Record<string, string> = {};
  if (!isPlainRecord(value)) return names;
  for (const [key, name] of Object.entries(value)) {
    if (typeof name === "string" && name.trim() !== "") {
      names[key] = name.trim();
    }
  }
  return names;
}

/**
 * A stored layout with every field it cannot trust dropped, or `null` when
 * it is not a layout object at all.
 *
 * @public
 */
export function sanitizeStoredLayout(
  parsed: unknown
): ColumnLayoutState | null {
  if (!isPlainRecord(parsed)) return null;
  const names = sanitizeNames(parsed.names);
  return {
    hidden: stringEntries(parsed.hidden),
    order: stringEntries(parsed.order),
    pinned: sanitizePinned(parsed.pinned),
    widths: sanitizeWidths(parsed.widths),
    ...(Object.keys(names).length > 0 ? { names } : {}),
  };
}

/**
 * Read the layout saved under `storageKey`, or `null` when none is saved,
 * storage cannot be read, or what is there is not a layout.
 *
 * @public
 */
export function readStoredColumnLayout(
  storage: LayoutStorage | undefined,
  storageKey: string
): ColumnLayoutState | null {
  try {
    const raw = storage?.getItem(storageKey);
    if (!raw) return null;
    const sanitized = sanitizeStoredLayout(JSON.parse(raw));
    if (sanitized === null) {
      devWarn(
        `stored column layout under "${storageKey}" is not a layout object — ignoring it.`
      );
    }
    return sanitized;
  } catch {
    // Corrupted or inaccessible storage (private mode, quota) reads as none.
    return null;
  }
}

/**
 * The layout a table starts from: the empty layout under a partial default.
 *
 * @public
 */
export function initialColumnLayout(
  defaultColumnLayout: Partial<ColumnLayoutState> | undefined
): ColumnLayoutState {
  return { ...EMPTY_COLUMN_LAYOUT, ...defaultColumnLayout };
}

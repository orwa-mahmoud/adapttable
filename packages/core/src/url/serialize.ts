/**
 * Pure helpers for reading and writing AdaptTable's URL state. Kept free
 * of React so they can be unit-tested directly and reused by any adapter.
 *
 * Conventions (compatible with shareable links):
 * - `page`, `limit`, `q`, `sortBy`, `sortDir`, `groupBy` are top-level params.
 * - Extra (caller-defined) filters live under the `f_` prefix.
 * - Arrays serialise as comma-separated, percent-encoded values (so a value
 *   may itself contain a comma); numbers are parsed back.
 * - Default values are omitted to keep the URL clean.
 */
import { MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from "../columns/columnResize";
import type { ColumnLayoutState } from "../columns/useColumnLayout";
import {
  parseFilterTree,
  serializeFilterTree,
} from "../filters/filterTreeCodec";
import { type RowPinSide, type RowPinState } from "../rows/rowPinning";
import type { QueryFilterGroup } from "../source/queryContract";
import type { ExtraFilters, FilterValue, SortDirection } from "../types";

/** Decode a URI component, tolerating malformed input from hand-edited URLs. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Split a comma list into trimmed, non-empty raw (still-encoded) parts. */
function splitRaw(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export const PARAM_PAGE = "page";
export const PARAM_LIMIT = "limit";
export const PARAM_SEARCH = "q";
export const PARAM_SORT_BY = "sortBy";
export const PARAM_SORT_DIR = "sortDir";
/** Multi-sort chain: `sort=name:asc,age:desc` (keys percent-encoded). */
export const PARAM_SORT = "sort";
/** Row grouping keys, comma-separated — outermost first. */
export const PARAM_GROUP_BY = "groupBy";
/** Keys under this prefix flow through as-is into the `extra` bag. */
export const FILTER_PREFIX = "f_";
/** Versioned AND/OR filter tree (`ft=1.{…}`). */
export const PARAM_FILTER_TREE = "ft";
/** Column-layout params (hidden / pinned / order / widths). */
/** Collapsed group keys, comma-separated. */
export const PARAM_GROUP_CLOSED = "groupClosed";
export const PARAM_COL_HIDDEN = "colHide";
export const PARAM_COL_PINNED = "colPin";
export const PARAM_COL_ORDER = "colOrder";
export const PARAM_COL_WIDTHS = "colW";
export const PARAM_COL_GROUPS = "colGroupCollapse";
/** Pinned rows: `rowPin=id1:top,id2:bottom`. */
export const PARAM_ROW_PIN = "rowPin";

/** Row density — a display choice, captured by saved views like the rest. */
export const PARAM_DENSITY = "density";

/** The pivot configuration. See `@adapttable/core/pivot`. */
export const PARAM_PIVOT = "pivot";

/** The user-typed formula columns. See `@adapttable/core/formula`. */
export const PARAM_FORMULA = "formula";

/** Read a 1-based page number, falling back when absent/invalid. */
export function readPage(
  params: URLSearchParams,
  fallback: number,
  prefix = ""
): number {
  const raw = params.get(prefix + PARAM_PAGE);
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Largest accepted page size — shared by the reader and the setter. */
export const MAX_LIMIT = 500;

/** Read a page size, clamped to a sane range, falling back when invalid. */
export function readLimit(
  params: URLSearchParams,
  fallback: number,
  prefix = ""
): number {
  const raw = params.get(prefix + PARAM_LIMIT);
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 && n <= MAX_LIMIT ? n : fallback;
}

/** Read a sort direction, or `undefined` when missing/invalid. */
export function readSortDir(
  params: URLSearchParams,
  prefix = ""
): SortDirection | undefined {
  const raw = params.get(prefix + PARAM_SORT_DIR);
  return raw === "asc" || raw === "desc" ? raw : undefined;
}

/**
 * Read the `f_`-prefixed extra filters, applying number/array parsing for
 * the registered keys.
 */
export function readExtra(
  params: URLSearchParams,
  numberKeys: readonly string[],
  arrayKeys: readonly string[],
  prefix = ""
): ExtraFilters {
  const filterPrefix = prefix + FILTER_PREFIX;
  const out: ExtraFilters = {};
  params.forEach((raw, key) => {
    if (!key.startsWith(filterPrefix) || raw === "") return;
    const bare = key.slice(filterPrefix.length);
    if (arrayKeys.includes(bare)) {
      const arr = raw
        .split(",")
        .map((v) => safeDecode(v).trim())
        .filter(Boolean);
      if (arr.length > 0) out[bare] = arr;
    } else if (numberKeys.includes(bare)) {
      const n = Number(raw);
      if (Number.isFinite(n)) out[bare] = n;
    } else {
      out[bare] = raw;
    }
  });
  return out;
}

/** True when a filter value should remove its param (empty/cleared). */
export function isEmptyFilterValue(value: FilterValue): boolean {
  if (value == null || value === "") return true;
  return Array.isArray(value) && value.length === 0;
}

/**
 * Write the full extra-filter bag into `params`, stripping any existing
 * `f_` entries first so cleared keys actually leave the URL.
 */
export function writeExtra(
  params: URLSearchParams,
  extra: ExtraFilters,
  prefix = ""
): void {
  const filterPrefix = prefix + FILTER_PREFIX;
  // Collect existing filter keys first, then delete — mutating while
  // iterating the live key iterator would skip entries.
  const staleKeys: string[] = [];
  params.forEach((_, key) => {
    if (key.startsWith(filterPrefix)) staleKeys.push(key);
  });
  for (const key of staleKeys) params.delete(key);
  for (const [key, value] of Object.entries(extra)) {
    if (isEmptyFilterValue(value)) continue;
    const param = `${filterPrefix}${key}`;
    if (Array.isArray(value)) {
      // Trim entries the same way the read side does, so values round-trip
      // byte-identical; percent-encode each element so a value may contain
      // the comma delimiter (and survives a URLSearchParams decode).
      const entries = value.map((v) => String(v).trim()).filter(Boolean);
      if (entries.length === 0) continue;
      params.set(param, entries.map((v) => encodeURIComponent(v)).join(","));
    } else {
      params.set(param, String(value));
    }
  }
}

/** Read the versioned filter tree; unknown versions are dropped. */
export function readFilterTreeParam(
  params: URLSearchParams,
  prefix = ""
): QueryFilterGroup | undefined {
  return parseFilterTree(params.get(prefix + PARAM_FILTER_TREE));
}

/** Write or clear the versioned filter tree. */
export function writeFilterTreeParam(
  params: URLSearchParams,
  tree: QueryFilterGroup | undefined,
  prefix = ""
): void {
  const key = prefix + PARAM_FILTER_TREE;
  const raw = serializeFilterTree(tree);
  if (raw) params.set(key, raw);
  else params.delete(key);
}

/**
 * Read the column layout (hidden / pinned / order / widths) from the URL.
 * Each column key is percent-encoded so `:` and `,` (the field/pair
 * delimiters) can never collide with a key. Returns `undefined` when the URL
 * carries no layout at all, so callers can fall back to their default layout.
 */
export function readColumnLayout(
  params: URLSearchParams,
  prefix = ""
): ColumnLayoutState | undefined {
  const hideRaw = params.get(prefix + PARAM_COL_HIDDEN);
  const pinRaw = params.get(prefix + PARAM_COL_PINNED);
  const orderRaw = params.get(prefix + PARAM_COL_ORDER);
  const widthRaw = params.get(prefix + PARAM_COL_WIDTHS);
  const groupRaw = params.get(prefix + PARAM_COL_GROUPS);
  if (
    hideRaw === null &&
    pinRaw === null &&
    orderRaw === null &&
    widthRaw === null &&
    groupRaw === null
  ) {
    return undefined;
  }

  const pinned: Record<string, "start" | "end"> = {};
  for (const pair of splitRaw(pinRaw)) {
    const [encKey, side] = pair.split(":");
    if (encKey && (side === "start" || side === "end")) {
      pinned[safeDecode(encKey)] = side;
    }
  }

  const widths: Record<string, number> = {};
  for (const pair of splitRaw(widthRaw)) {
    const [encKey, px] = pair.split(":");
    const n = Number(px);
    if (encKey && Number.isFinite(n) && n > 0) {
      // URL input is hostile: clamp to the same sane range the resize UI
      // can produce, so a hand-edited colW of 1e9 cannot blow the layout.
      widths[safeDecode(encKey)] = Math.min(
        Math.max(n, MIN_COLUMN_WIDTH),
        MAX_COLUMN_WIDTH
      );
    }
  }

  const collapsedGroups = splitRaw(groupRaw).map(safeDecode);
  return {
    hidden: splitRaw(hideRaw).map(safeDecode),
    order: splitRaw(orderRaw).map(safeDecode),
    pinned,
    widths,
    ...(collapsedGroups.length > 0 ? { collapsedGroups } : {}),
  };
}

/**
 * Write the column layout into `params`, dropping any field that is empty so
 * a pristine layout leaves no params behind.
 */
export function writeColumnLayout(
  params: URLSearchParams,
  layout: ColumnLayoutState,
  prefix = ""
): void {
  const setOrDelete = (param: string, value: string): void => {
    if (value) params.set(prefix + param, value);
    else params.delete(prefix + param);
  };
  setOrDelete(
    PARAM_COL_HIDDEN,
    layout.hidden.map((key) => encodeURIComponent(key)).join(",")
  );
  setOrDelete(
    PARAM_COL_PINNED,
    Object.entries(layout.pinned)
      .map(([key, side]) => `${encodeURIComponent(key)}:${side}`)
      .join(",")
  );
  setOrDelete(
    PARAM_COL_ORDER,
    layout.order.map((key) => encodeURIComponent(key)).join(",")
  );
  setOrDelete(
    PARAM_COL_WIDTHS,
    Object.entries(layout.widths)
      .map(([key, px]) => `${encodeURIComponent(key)}:${Math.round(px)}`)
      .join(",")
  );
  setOrDelete(
    PARAM_COL_GROUPS,
    (layout.collapsedGroups ?? []).map((id) => encodeURIComponent(id)).join(",")
  );
}

/** Read the multi-sort chain (`sort=key:dir,key2:dir2`). */
export function readSortLevels(
  params: URLSearchParams,
  prefix = ""
): { key: string; dir: SortDirection }[] {
  const out: { key: string; dir: SortDirection }[] = [];
  for (const pair of splitRaw(params.get(prefix + PARAM_SORT))) {
    const [encKey, dir] = pair.split(":");
    if (encKey && (dir === "asc" || dir === "desc")) {
      out.push({ key: safeDecode(encKey), dir });
    }
  }
  return out;
}

/** Write (or clear, when empty) the multi-sort chain. */
export function writeSortLevels(
  params: URLSearchParams,
  levels: readonly { key: string; dir: SortDirection }[],
  prefix = ""
): void {
  if (levels.length === 0) {
    params.delete(prefix + PARAM_SORT);
    return;
  }
  params.set(
    prefix + PARAM_SORT,
    levels.map((l) => `${encodeURIComponent(l.key)}:${l.dir}`).join(",")
  );
}

/**
 * Read the collapsed group keys.
 *
 * @param params - The URL parameters.
 * @param prefix - The table's namespace, when it has one.
 * @returns The keys, or `undefined` when the parameter is absent — which means
 *   "nothing has been said", not "nothing is collapsed".
 */
export function readCollapsedGroups(
  params: URLSearchParams,
  prefix = ""
): string[] | undefined {
  const raw = params.get(prefix + PARAM_GROUP_CLOSED);
  if (raw === null) return undefined;
  return raw
    .split(",")
    .filter((key) => key.length > 0)
    .map((key) => decodeURIComponent(key));
}

/**
 * Write the collapsed group keys, dropping the parameter when none are.
 *
 * @param params - The URL parameters, mutated in place.
 * @param keys - The collapsed group keys.
 * @param prefix - The table's namespace, when it has one.
 */
export function writeCollapsedGroups(
  params: URLSearchParams,
  keys: readonly string[],
  prefix = ""
): void {
  const value = keys.map((key) => encodeURIComponent(key)).join(",");
  if (value) params.set(prefix + PARAM_GROUP_CLOSED, value);
  else params.delete(prefix + PARAM_GROUP_CLOSED);
}

/**
 * Read pinned row ids (`rowPin=id1:top,id2:bottom`).
 *
 * @param params - The URL parameters.
 * @param prefix - The table's namespace, when it has one.
 * @returns The lists, or `undefined` when the parameter is absent.
 */
export function readRowPins(
  params: URLSearchParams,
  prefix = ""
): RowPinState | undefined {
  const raw = params.get(prefix + PARAM_ROW_PIN);
  if (raw === null) return undefined;
  const top: string[] = [];
  const bottom: string[] = [];
  for (const pair of splitRaw(raw)) {
    const colon = pair.lastIndexOf(":");
    if (colon <= 0) continue;
    const id = safeDecode(pair.slice(0, colon));
    const side = pair.slice(colon + 1);
    if (!id) continue;
    if (side === "top") top.push(id);
    else if (side === "bottom") bottom.push(id);
  }
  return { top, bottom };
}

/**
 * Write pinned row ids, dropping the parameter when both lists are empty.
 *
 * @param params - The URL parameters, mutated in place.
 * @param state - The pin lists.
 * @param prefix - The table's namespace, when it has one.
 */
export function writeRowPins(
  params: URLSearchParams,
  state: RowPinState,
  prefix = ""
): void {
  const pairs: string[] = [];
  const push = (id: string, side: RowPinSide): void => {
    pairs.push(`${encodeURIComponent(id)}:${side}`);
  };
  for (const id of state.top) push(id, "top");
  for (const id of state.bottom) push(id, "bottom");
  if (pairs.length > 0) params.set(prefix + PARAM_ROW_PIN, pairs.join(","));
  else params.delete(prefix + PARAM_ROW_PIN);
}

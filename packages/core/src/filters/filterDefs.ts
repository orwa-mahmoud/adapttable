/**
 * Declarative filters. One definition per filter drives everything the four
 * hand-wired pieces used to: the widget an adapter renders, the URL parsing
 * (array/number keys self-register), the chip labels, and the client-side
 * predicate. Definitions come from two places — a column's `filter` shorthand
 * and the table-level `filters` array — merged by {@link resolveFilterDefs}.
 */
import { localizedColumnPath } from "../columns/resolveColumns";
import type { ColumnDef, ExtraFilters, FilterValue } from "../types";
import { devWarn } from "../utils/devWarn";
import { humanizeKey } from "../utils/humanizeKey";
import { getPath } from "../utils/path";
import type { ChipLabelResolver } from "./useActiveFilterChips";

/** Every built-in filter shape, exported so consumers never hand-type them. */
export const FILTER_TYPES = [
  "text",
  "select",
  "multiSelect",
  "dateRange",
  "numberRange",
] as const;

/** A built-in filter shape. */
export type FilterType = (typeof FILTER_TYPES)[number];

/** One choice in a `select` / `multiSelect` filter. */
export interface FilterOption {
  value: string;
  label: string;
}

/**
 * Where a select/multiSelect gets its choices: a static array, `"auto"`
 * (distinct values derived from the data — frontend tier; capped and
 * sorted), or an async loader resolved lazily when the form first renders.
 */
export type FilterOptionsSource =
  | readonly FilterOption[]
  | "auto"
  | (() => Promise<readonly FilterOption[]>);

/** Most distinct values `"auto"` will derive before truncating. */
export const AUTO_OPTIONS_LIMIT = 50;

/** A full, standalone filter definition (the `filters` array form). */
export interface FilterDef<TRow = unknown> {
  /**
   * State key in the filter bag (and the `f_<key>` URL param). Doubles as
   * the row's data path for the client-side predicate — dot paths reach
   * nested values (`"department.name"`) — unless `getValue` overrides it.
   */
  key: string;
  /** The widget shape. */
  type: FilterType;
  /** Widget + chip label. Defaults to a humanized `key` ("hiredAt" → "Hired At"). */
  label?: string;
  /** Choices for `select` / `multiSelect` — see {@link FilterOptionsSource}. */
  options?: FilterOptionsSource;
  /** Row-value extractor for the client-side predicate; defaults to `key` as a path. */
  getValue?: (row: TRow) => unknown;
  /** Placeholder for text-like inputs. */
  placeholder?: string;
}

/**
 * The column-level shorthand: a bare type, or a definition without `key` /
 * `label` (both inherited from the column).
 */
export type ColumnFilter<TRow = unknown> =
  | FilterType
  | (Omit<FilterDef<TRow>, "key" | "label"> & { label?: string });

/** Suffix pair used by the two-field range types. */
export const RANGE_SUFFIXES = {
  dateRange: { start: "From", end: "To" },
  numberRange: { start: "Min", end: "Max" },
} as const;

/** The state keys a definition reads/writes in the filter bag. */
export function filterStateKeys(
  def: Pick<FilterDef, "key" | "type">
): string[] {
  if (def.type === "dateRange" || def.type === "numberRange") {
    const s = RANGE_SUFFIXES[def.type];
    return [def.key + s.start, def.key + s.end];
  }
  return [def.key];
}

/**
 * Merge column-declared filters with the standalone `filters` array into the
 * final ordered definition list: column filters first (in column order), then
 * standalone definitions. A standalone definition with the same `key` as a
 * column filter WINS — documented override semantics, with a development
 * warning so accidental duplication is visible.
 */
export function resolveFilterDefs<TRow>(
  columns: readonly ColumnDef<TRow>[],
  filters: readonly FilterDef<TRow>[] | undefined,
  locale?: string
): FilterDef<TRow>[] {
  const standalone = filters ?? [];
  const standaloneKeys = new Set(standalone.map((d) => d.key));
  const fromColumns: FilterDef<TRow>[] = [];
  for (const column of columns) {
    if (!column.filter) continue;
    const base =
      typeof column.filter === "string"
        ? { type: column.filter }
        : column.filter;
    if (standaloneKeys.has(column.key)) {
      devWarn(
        `column "${column.key}" declares a filter but \`filters\` also defines that key — using the \`filters\` definition. Remove one to silence this.`
      );
      continue;
    }
    // A localized column's filter matches against the same locale-resolved
    // path the cell shows (unless the shorthand brings its own getValue).
    const path = localizedColumnPath(column, locale);
    fromColumns.push({
      key: column.key,
      label:
        base.label ??
        (typeof column.header === "string" ? column.header : undefined),
      ...(path === column.key
        ? {}
        : { getValue: (row: TRow) => getPath(row, path) }),
      ...base,
    });
  }
  return [...fromColumns, ...standalone];
}

/** Resolved label for a definition (explicit, else humanized key). */
export function filterLabel(def: Pick<FilterDef, "key" | "label">): string {
  return def.label ?? humanizeKey(def.key);
}

const has = (extra: ExtraFilters, key: string): boolean => {
  const v = extra[key];
  if (v == null || v === "") return false;
  return !Array.isArray(v) || v.length > 0;
};

/** A row value as comparable text; non-primitives never match anything. */
function valueText(value: unknown): string {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "boolean":
    case "bigint":
      return String(value);
    default:
      return "";
  }
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const END_OF_DAY_MS = 86_399_999;

/**
 * One coercion path for everything `dateRange` compares — row values and
 * bounds alike. The timezone rule: a date-only string (`"2026-01-31"`,
 * what date pickers and the URL carry) means that day in the USER'S LOCAL
 * timezone; a `Date`, an epoch-milliseconds number, or a datetime string
 * is an absolute instant. Comparing local day windows against absolute
 * row instants keeps boundary days stable in every timezone.
 *
 * @returns Epoch milliseconds, or `NaN` for anything unparseable.
 */
function dateValueToEpochMs(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  const text = value.trim();
  if (text === "") return Number.NaN;
  if (DATE_ONLY_RE.test(text)) {
    const [year = 0, month = 1, day = 1] = text.split("-").map(Number);
    return new Date(year, month - 1, day).getTime();
  }
  return new Date(text).getTime();
}

/**
 * A row value as a number for range filtering, or `NaN` when the row has
 * no numeric value. `Number(null)` and `Number("")` are `0`, which would
 * silently include no-value rows in any range spanning zero — so only
 * real numbers and non-empty numeric strings qualify.
 */
function numericRowValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}

function textMatch(rowValue: unknown, term: string): boolean {
  const text = valueText(rowValue).toLowerCase();
  return text !== "" && text.includes(term.toLowerCase());
}

/** Build one definition's client-side predicate (true = row matches). */
export function filterPredicate<TRow>(
  def: FilterDef<TRow>
): (row: TRow, extra: ExtraFilters) => boolean {
  const value = (row: TRow): unknown =>
    def.getValue ? def.getValue(row) : getPath(row, def.key);
  switch (def.type) {
    case "text":
      return (row, extra) =>
        !has(extra, def.key) || textMatch(value(row), String(extra[def.key]));
    case "select":
      return (row, extra) =>
        !has(extra, def.key) ||
        valueText(value(row)) === String(extra[def.key]);
    case "multiSelect":
      return (row, extra) => {
        if (!has(extra, def.key)) return true;
        const selected = extra[def.key];
        const list = Array.isArray(selected) ? selected : [String(selected)];
        return list.includes(valueText(value(row)));
      };
    case "dateRange": {
      const [fromKey, toKey] = filterStateKeys(def);
      return (row, extra) => {
        if (!has(extra, fromKey!) && !has(extra, toKey!)) return true;
        const time = dateValueToEpochMs(value(row));
        if (Number.isNaN(time)) return false;
        if (has(extra, fromKey!)) {
          const from = dateValueToEpochMs(extra[fromKey!]);
          if (time < from) return false;
        }
        if (has(extra, toKey!)) {
          const bound = extra[toKey!];
          // Inclusive: a date-only "to" keeps that whole (local) day's
          // rows; an exact datetime bound is inclusive as given.
          const to =
            dateValueToEpochMs(bound) +
            (typeof bound === "string" && DATE_ONLY_RE.test(bound.trim())
              ? END_OF_DAY_MS
              : 0);
          if (time > to) return false;
        }
        return true;
      };
    }
    case "numberRange": {
      const [minKey, maxKey] = filterStateKeys(def);
      return (row, extra) => {
        if (!has(extra, minKey!) && !has(extra, maxKey!)) return true;
        const n = numericRowValue(value(row));
        if (Number.isNaN(n)) return false;
        if (has(extra, minKey!) && n < Number(extra[minKey!])) return false;
        return !(has(extra, maxKey!) && n > Number(extra[maxKey!]));
      };
    }
  }
}

/** Everything the table engine derives from the resolved definitions. */
export interface FilterRuntime<TRow> {
  /** The merged, ordered definitions (drives the auto-built form). */
  defs: readonly FilterDef<TRow>[];
  /** Keys whose URL values parse as comma-separated arrays. */
  arrayExtraKeys: string[];
  /** Keys whose URL values parse as numbers. */
  numberExtraKeys: string[];
  /** Chip label resolvers, one per state key. */
  filterLabels: Record<string, ChipLabelResolver>;
  /** AND-composed client-side predicate across every definition. */
  filterFn: (row: TRow, extra: ExtraFilters) => boolean;
}

const optionLabel = (
  def: Pick<FilterDef, "options">,
  value: string
): string => {
  // Only materialized arrays can map values to labels; `"auto"` is
  // materialized before the runtime builds, and async options label their
  // chips with the raw value until loaded.
  if (!Array.isArray(def.options)) return value;
  const options: readonly FilterOption[] = def.options;
  return options.find((o) => o.value === value)?.label ?? value;
};

/** Derive the full runtime (URL keys, chips, predicate) from definitions. */
export function buildFilterRuntime<TRow>(
  defs: readonly FilterDef<TRow>[]
): FilterRuntime<TRow> {
  const arrayExtraKeys: string[] = [];
  const numberExtraKeys: string[] = [];
  const filterLabels: Record<string, ChipLabelResolver> = {};
  const predicates = defs.map((def) => filterPredicate(def));

  for (const def of defs) {
    const label = filterLabel(def);
    switch (def.type) {
      case "multiSelect":
        arrayExtraKeys.push(def.key);
        filterLabels[def.key] = (v) => `${label}: ${optionLabel(def, v)}`;
        break;
      case "select":
        filterLabels[def.key] = (v) => `${label}: ${optionLabel(def, v)}`;
        break;
      case "text":
        filterLabels[def.key] = (v) => `${label}: ${v}`;
        break;
      case "dateRange": {
        const [fromKey, toKey] = filterStateKeys(def);
        filterLabels[fromKey!] = (v) => `${label} ≥ ${v}`;
        filterLabels[toKey!] = (v) => `${label} ≤ ${v}`;
        break;
      }
      case "numberRange": {
        const [minKey, maxKey] = filterStateKeys(def);
        numberExtraKeys.push(minKey!, maxKey!);
        filterLabels[minKey!] = (v) => `${label} ≥ ${v}`;
        filterLabels[maxKey!] = (v) => `${label} ≤ ${v}`;
        break;
      }
    }
  }

  return {
    defs,
    arrayExtraKeys,
    numberExtraKeys,
    filterLabels,
    filterFn: (row, extra) => predicates.every((p) => p(row, extra)),
  };
}

/** The cleared state for every key a definition list owns. */
export function clearedFilterExtras<TRow>(
  defs: readonly FilterDef<TRow>[]
): ExtraFilters {
  const out: Record<string, FilterValue> = {};
  for (const def of defs) {
    for (const key of filterStateKeys(def)) out[key] = undefined;
  }
  return out;
}

/**
 * Materialize `"auto"` option sources from the data: the distinct values of
 * each such definition's row projection, sorted, capped at
 * {@link AUTO_OPTIONS_LIMIT}. Static arrays and async loaders pass through
 * untouched. Run BEFORE {@link buildFilterRuntime} so chips can label the
 * derived values.
 */
export function materializeAutoOptions<TRow>(
  defs: readonly FilterDef<TRow>[],
  rows: readonly TRow[]
): FilterDef<TRow>[] {
  return defs.map((def) => {
    if (def.options !== "auto") return def;
    const seen = new Set<string>();
    for (const row of rows) {
      const text = valueText(
        def.getValue ? def.getValue(row) : getPath(row, def.key)
      );
      if (text !== "") seen.add(text);
      if (seen.size > AUTO_OPTIONS_LIMIT) break;
    }
    const options = [...seen]
      .sort((a, b) => a.localeCompare(b))
      .slice(0, AUTO_OPTIONS_LIMIT)
      .map((value) => ({ value, label: value }));
    return { ...def, options };
  });
}

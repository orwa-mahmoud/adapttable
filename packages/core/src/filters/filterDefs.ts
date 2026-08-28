/**
 * Declarative filters. One definition per filter drives everything the four
 * hand-wired pieces used to: the widget an adapter renders, the URL parsing
 * (array/number keys self-register), the chip labels, and the client-side
 * predicate. Definitions come from two places — a column's `filter` shorthand
 * and the table-level `filters` array — merged by {@link resolveFilterDefs}.
 */
import { localizedColumnPath } from "../columns/resolveColumns";
import { defaultLabels } from "../labels";
import type { QueryCondition } from "../source/queryContract";
import type {
  ColumnDef,
  ExtraFilters,
  FilterValue,
  TableLabels,
} from "../types";
import { devWarn } from "../utils/devWarn";
import { humanizeKey } from "../utils/humanizeKey";
import { getPath } from "../utils/path";
import type { FilterTypeRegistry, FilterTypeSpec } from "./filterRegistry";
import {
  DATE_OP_LABEL_KEYS,
  DATE_OPS,
  type DateOp,
  filterOpKey,
  formatFilterChip,
  isEmptyRowValue,
  NUMBER_OP_LABEL_KEYS,
  NUMBER_OPS,
  type NumberOp,
  parseDateOp,
  parseNumberList,
  parseNumberOp,
  parseTextOp,
  TEXT_OP_LABEL_KEYS,
  TEXT_OPS,
} from "./operators";
import { relativeTokenLabel, resolveRelativeRange } from "./relativeDates";
import type { ChipLabelResolver } from "./useActiveFilterChips";

/**
 * Every built-in filter shape, exported so consumers never hand-type them.
 *
 * @public
 */
export const FILTER_TYPES = [
  "text",
  "select",
  "multiSelect",
  "checklist",
  "boolean",
  "dateRange",
  "numberRange",
] as const;

/**
 * A built-in filter shape.
 *
 * @public
 */
export type FilterType = (typeof FILTER_TYPES)[number];

/**
 * One choice in a `select` / `multiSelect` filter.
 *
 * @public
 */
export interface FilterOption {
  /** The value itself. */
  value: string;
  /** Caption shown for the entry. */
  label: string;
}

/**
 * Where a select/multiSelect gets its choices: a static array, `"auto"`
 * (distinct values derived from the data — frontend tier; capped and
 * sorted), or an async loader resolved lazily when the form first renders.
 *
 * @public
 */
export type FilterOptionsSource =
  readonly FilterOption[] | "auto" | (() => Promise<readonly FilterOption[]>);

/**
 * Most distinct values `"auto"` will derive before truncating.
 *
 * @internal
 */
export const AUTO_OPTIONS_LIMIT = 50;

/**
 * A full, standalone filter definition (the `filters` array form).
 *
 * @public
 */
export interface FilterDef<TRow = unknown> {
  /**
   * State key in the filter bag (and the `f_<key>` URL param). Doubles as
   * the row's data path for the client-side predicate — dot paths reach
   * nested values (`"department.name"`) — unless `getValue` overrides it.
   */
  key: string;
  /**
   * Column key the header filter row places this widget under.
   * Defaults to `key` when the filter bag and the column share a
   * name; set it when they differ (`key: "name"` under `column: "person"`).
   */
  column?: string;
  /**
   * The widget shape. Built-ins are {@link FilterType}; any other string
   * is a custom type that must be registered on `filterTypes`.
   */
  type: string;
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
 *
 * @public
 */
export type ColumnFilter<TRow = unknown> =
  FilterType | (Omit<FilterDef<TRow>, "key" | "label"> & { label?: string });

/**
 * Suffix pair used by the two-field range types.
 *
 * @internal
 */
export const RANGE_SUFFIXES = {
  dateRange: { start: "From", end: "To" },
  numberRange: { start: "Min", end: "Max" },
} as const;

/**
 * The state keys a definition reads/writes in the filter bag.
 *
 * @internal
 */
export function filterStateKeys(
  def: Pick<FilterDef, "key" | "type">,
  registry?: FilterTypeRegistry
): string[] {
  const spec = registry?.get(def.type);
  if (spec) return spec.stateKeys(def);
  return [def.key];
}

/**
 * Coerce a row value to a boolean, or `undefined` when it has no truth.
 *
 * @internal
 */
export function coerceBooleanValue(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  if (typeof value === "string") {
    const token = value.trim().toLowerCase();
    if (token === "true" || token === "yes") return true;
    if (token === "false" || token === "no") return false;
    if (token === "") return undefined;
  }
  if (value == null) return undefined;
  return Boolean(value);
}

function booleanChoiceOn(value: FilterValue): boolean {
  return value === "true" || value === 1;
}

/**
 * Merge column-declared filters with the standalone `filters` array into the
 * final ordered definition list: column filters first (in column order), then
 * standalone definitions. A standalone definition with the same `key` as a
 * column filter WINS — documented override semantics, with a development
 * warning so accidental duplication is visible.
 *
 * @internal
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

/**
 * Resolved label for a definition (explicit, else humanized key).
 *
 * @internal
 */
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

function textRowMatches(
  op: ReturnType<typeof parseTextOp>,
  rowValue: unknown,
  term: string
): boolean {
  if (op === "empty") return isEmptyRowValue(rowValue);
  if (op === "notEmpty") return !isEmptyRowValue(rowValue);
  const text = valueText(rowValue).toLowerCase();
  const needle = term.toLowerCase();
  switch (op) {
    case "eq":
      return text === needle;
    case "neq":
      return text !== needle;
    case "contains":
      return textMatch(rowValue, term);
    case "notContains":
      return !text.includes(needle);
    case "startsWith":
      return text !== "" && text.startsWith(needle);
    case "endsWith":
      return text !== "" && text.endsWith(needle);
  }
}

function dateUpperBoundMs(bound: FilterValue): number {
  return (
    dateValueToEpochMs(bound) +
    (typeof bound === "string" && DATE_ONLY_RE.test(bound.trim())
      ? END_OF_DAY_MS
      : 0)
  );
}

function dateOnMatch(time: number, day: FilterValue | undefined): boolean {
  if (day == null || day === "") return true;
  const start = dateValueToEpochMs(day);
  return time >= start && time <= dateUpperBoundMs(day);
}

function dateInclusiveBounds(
  time: number,
  extra: ExtraFilters,
  fromKey: string,
  toKey: string
): boolean {
  if (has(extra, fromKey) && time < dateValueToEpochMs(extra[fromKey])) {
    return false;
  }
  if (has(extra, toKey) && time > dateUpperBoundMs(extra[toKey])) {
    return false;
  }
  return true;
}

function dateRowMatches(
  op: DateOp | undefined,
  time: number,
  extra: ExtraFilters,
  fromKey: string,
  toKey: string
): boolean {
  if (op === "empty") return Number.isNaN(time);
  if (op === "relative") {
    const range = resolveRelativeRange(String(extra[fromKey] ?? ""));
    if (!range) return true;
    return time >= range.startMs && time <= range.endMs;
  }
  if (Number.isNaN(time)) return false;
  if (op === "before" && has(extra, toKey)) {
    return time < dateValueToEpochMs(extra[toKey]);
  }
  if (op === "after" && has(extra, fromKey)) {
    return time > dateUpperBoundMs(extra[fromKey]);
  }
  if (op === "on") {
    const day = has(extra, fromKey) ? extra[fromKey] : extra[toKey];
    return dateOnMatch(time, day);
  }
  return dateInclusiveBounds(time, extra, fromKey, toKey);
}

function numberRowMatches(
  op: NumberOp | undefined,
  n: number,
  extra: ExtraFilters,
  minKey: string,
  maxKey: string,
  listKey: string
): boolean {
  if (Number.isNaN(n)) return false;
  if (op === "in") return parseNumberList(extra[listKey]).includes(n);
  if (op === "notIn") return !parseNumberList(extra[listKey]).includes(n);
  const min = has(extra, minKey) ? Number(extra[minKey]) : Number.NaN;
  const max = has(extra, maxKey) ? Number(extra[maxKey]) : Number.NaN;
  switch (op) {
    case "eq":
      return !Number.isNaN(min) && n === min;
    case "neq":
      return !Number.isNaN(min) && n !== min;
    case "gt":
      return !Number.isNaN(min) && n > min;
    case "gte":
      return !Number.isNaN(min) && n >= min;
    case "lt":
      return !Number.isNaN(max) && n < max;
    case "lte":
      return !Number.isNaN(max) && n <= max;
    default:
      if (!Number.isNaN(min) && n < min) return false;
      return Number.isNaN(max) || n <= max;
  }
}

function textFilterActive(extra: ExtraFilters, key: string): boolean {
  const op = parseTextOp(extra[filterOpKey(key)]);
  if (op === "empty" || op === "notEmpty") return true;
  return has(extra, key);
}

function dateFilterActive(
  extra: ExtraFilters,
  key: string,
  fromKey: string,
  toKey: string
): boolean {
  const op = parseDateOp(extra[filterOpKey(key)]);
  if (op === "empty") return true;
  if (op === "relative") return has(extra, fromKey);
  return has(extra, fromKey) || has(extra, toKey);
}

function numberFilterActive(
  extra: ExtraFilters,
  key: string,
  minKey: string,
  maxKey: string
): boolean {
  const op = parseNumberOp(extra[filterOpKey(key)]);
  if (op === "in" || op === "notIn") return has(extra, key);
  return has(extra, minKey) || has(extra, maxKey);
}

function rowValue<TRow>(def: FilterDef<TRow>, row: TRow): unknown {
  return def.getValue ? def.getValue(row) : getPath(row, def.key);
}

function asConditionScalar(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function asConditionList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  const one = asConditionScalar(value);
  return one == null ? [] : [one];
}

function asConditionPair(value: unknown): {
  a: string | undefined;
  b: string | undefined;
} {
  if (Array.isArray(value)) {
    return { a: asConditionScalar(value[0]), b: asConditionScalar(value[1]) };
  }
  return { a: asConditionScalar(value), b: undefined };
}

function rangeConditionToExtra<TRow>(
  def: FilterDef<TRow>,
  condition: QueryCondition,
  flavour: "dateRange" | "numberRange"
): ExtraFilters {
  const opKey = filterOpKey(def.key);
  const op = condition.op;
  const suffixes = RANGE_SUFFIXES[flavour];
  const lowKey = def.key + suffixes.start;
  const highKey = def.key + suffixes.end;
  if (op === "empty" || op === "notEmpty") return { [opKey]: op };
  if (op === "in" || op === "notIn") {
    const list = asConditionList(condition.value);
    return { [def.key]: list.length > 0 ? list : undefined, [opKey]: op };
  }
  if (op === "between") {
    const { a, b } = asConditionPair(condition.value);
    return { [lowKey]: a, [highKey]: b, [opKey]: op };
  }
  if (op === "before" || op === "lte" || op === "lt") {
    return { [highKey]: asConditionScalar(condition.value), [opKey]: op };
  }
  return { [lowKey]: asConditionScalar(condition.value), [opKey]: op };
}

function scalarConditionToExtra<TRow>(
  def: FilterDef<TRow>,
  condition: QueryCondition
): ExtraFilters {
  return {
    [def.key]: asConditionScalar(condition.value),
    [filterOpKey(def.key)]: condition.op,
  };
}

function listConditionToExtra<TRow>(
  def: FilterDef<TRow>,
  condition: QueryCondition
): ExtraFilters {
  const list = asConditionList(condition.value);
  return { [def.key]: list.length > 0 ? list : undefined };
}

function textStateKeys(def: Pick<FilterDef, "key">): string[] {
  return [def.key, filterOpKey(def.key)];
}

function rangeStateKeys(
  def: Pick<FilterDef, "key">,
  flavour: "dateRange" | "numberRange"
): string[] {
  const s = RANGE_SUFFIXES[flavour];
  const pair = [def.key + s.start, def.key + s.end, filterOpKey(def.key)];
  return flavour === "numberRange" ? [def.key, ...pair] : pair;
}

function textSpec(): FilterTypeSpec {
  return {
    type: "text",
    widget: "text",
    ops: TEXT_OPS,
    defaultOp: "contains",
    stateKeys: textStateKeys,
    match: (def, extra, row) => {
      if (!textFilterActive(extra, def.key)) return true;
      return textRowMatches(
        parseTextOp(extra[filterOpKey(def.key)]),
        rowValue(def, row),
        String(extra[def.key] ?? "")
      );
    },
    chips: (def) => {
      const label = filterLabel(def);
      return {
        [def.key]: (v: string, extra?: ExtraFilters) =>
          textChipLabel(label, v, extra, def.key),
        [filterOpKey(def.key)]: (v: string) => emptyOpChip(label, v),
      };
    },
    conditionToExtra: scalarConditionToExtra,
  };
}

function selectSpec(type: "select"): FilterTypeSpec {
  return {
    type,
    widget: type,
    ops: ["eq"],
    defaultOp: "eq",
    stateKeys: (def) => [def.key],
    match: (def, extra, row) =>
      !has(extra, def.key) ||
      valueText(rowValue(def, row)) === String(extra[def.key]),
    chips: (def) => ({
      [def.key]: (v: string) => `${filterLabel(def)}: ${optionLabel(def, v)}`,
    }),
    conditionToExtra: scalarConditionToExtra,
  };
}

function listSpec(type: "multiSelect" | "checklist"): FilterTypeSpec {
  return {
    type,
    widget: type,
    ops: ["in"],
    defaultOp: "in",
    urlArray: true,
    stateKeys: (def) => [def.key],
    match: (def, extra, row) => {
      if (!has(extra, def.key)) return true;
      const selected = extra[def.key];
      const list = Array.isArray(selected) ? selected : [String(selected)];
      return list.includes(valueText(rowValue(def, row)));
    },
    chips: (def) => ({
      [def.key]: (v: string) => `${filterLabel(def)}: ${optionLabel(def, v)}`,
    }),
    conditionToExtra: listConditionToExtra,
  };
}

function booleanSpec(): FilterTypeSpec {
  return {
    type: "boolean",
    widget: "boolean",
    ops: ["eq"],
    defaultOp: "eq",
    stateKeys: (def) => [def.key],
    match: (def, extra, row) => {
      if (!has(extra, def.key)) return true;
      return (
        coerceBooleanValue(rowValue(def, row)) ===
        booleanChoiceOn(extra[def.key])
      );
    },
    chips: (def) => ({
      [def.key]: (v: string) =>
        `${filterLabel(def)}: ${
          booleanChoiceOn(v) ? defaultLabels.boolTrue : defaultLabels.boolFalse
        }`,
    }),
    conditionToExtra: scalarConditionToExtra,
  };
}

function rangeSpec(flavour: "dateRange" | "numberRange"): FilterTypeSpec {
  const isDate = flavour === "dateRange";
  return {
    type: flavour,
    widget: flavour,
    ops: isDate ? DATE_OPS : NUMBER_OPS,
    defaultOp: isDate ? "on" : "gte",
    urlArray: !isDate,
    urlNumberKeys: !isDate,
    stateKeys: (def) => rangeStateKeys(def, flavour),
    match: (def, extra, row) => {
      const low = def.key + RANGE_SUFFIXES[flavour].start;
      const high = def.key + RANGE_SUFFIXES[flavour].end;
      if (isDate) {
        if (!dateFilterActive(extra, def.key, low, high)) return true;
        return dateRowMatches(
          parseDateOp(extra[filterOpKey(def.key)]),
          dateValueToEpochMs(rowValue(def, row)),
          extra,
          low,
          high
        );
      }
      if (!numberFilterActive(extra, def.key, low, high)) return true;
      return numberRowMatches(
        parseNumberOp(extra[filterOpKey(def.key)]),
        numericRowValue(rowValue(def, row)),
        extra,
        low,
        high,
        def.key
      );
    },
    chips: (def) => {
      const label = filterLabel(def);
      const low = def.key + RANGE_SUFFIXES[flavour].start;
      const high = def.key + RANGE_SUFFIXES[flavour].end;
      const flavourName = isDate ? "date" : "number";
      const chips: Record<string, ChipLabelResolver> = {
        [low]: (v, extra) =>
          rangeChipLabel(label, v, extra, def.key, "low", flavourName),
        [high]: (v, extra) =>
          rangeChipLabel(label, v, extra, def.key, "high", flavourName),
        [filterOpKey(def.key)]: (v) => emptyOpChip(label, v),
      };
      if (!isDate) {
        chips[def.key] = (v, extra) =>
          rangeChipLabel(label, v, extra, def.key, "low", "number");
      }
      return chips;
    },
    conditionToExtra: (def, condition) =>
      rangeConditionToExtra(def, condition, flavour),
  };
}

/** Built-in types — the registry's first consumers. */
/** Built-in specs — imported only by {@link defaultFilterRegistry}. */
export function createBuiltInFilterSpecs(): FilterTypeSpec[] {
  return [
    textSpec(),
    selectSpec("select"),
    listSpec("multiSelect"),
    listSpec("checklist"),
    booleanSpec(),
    rangeSpec("dateRange"),
    rangeSpec("numberRange"),
  ];
}

/**
 * Build one definition's client-side predicate (true = row matches).
 *
 * @internal
 */
export function filterPredicate<TRow>(
  def: FilterDef<TRow>,
  registry: FilterTypeRegistry
): (row: TRow, extra: ExtraFilters) => boolean {
  const spec = registry.get(def.type);
  if (!spec) {
    devWarn(`Unknown filter type "${def.type}"`);
    return () => true;
  }
  return (row, extra) => spec.match(def, extra, row);
}

/**
 * Everything the table engine derives from the resolved definitions.
 *
 * @public
 */
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
  /** Type registry used to derive this runtime. */
  registry: FilterTypeRegistry;
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

function opWord(labels: Required<TableLabels>, key: keyof TableLabels): string {
  const value = labels[key];
  return typeof value === "string" ? value : key;
}

function textChipLabel(
  field: string,
  value: string,
  extra: ExtraFilters | undefined,
  key: string
): string {
  const op = parseTextOp(extra?.[filterOpKey(key)]);
  return formatFilterChip(
    field,
    opWord(defaultLabels, TEXT_OP_LABEL_KEYS[op]),
    value
  );
}

function rangeChipLabel(
  field: string,
  value: string,
  extra: ExtraFilters | undefined,
  key: string,
  side: "low" | "high",
  flavour: "number" | "date"
): string {
  const raw = extra?.[filterOpKey(key)];
  if (flavour === "number") {
    const op = parseNumberOp(raw);
    if (op && op !== "between") {
      return formatFilterChip(
        field,
        opWord(defaultLabels, NUMBER_OP_LABEL_KEYS[op]),
        value
      );
    }
  } else {
    const op = parseDateOp(raw);
    if (op === "relative") {
      return formatFilterChip(field, relativeTokenLabel(value, defaultLabels));
    }
    if (op && op !== "between") {
      return formatFilterChip(
        field,
        opWord(defaultLabels, DATE_OP_LABEL_KEYS[op]),
        value
      );
    }
  }
  return side === "low" ? `${field} ≥ ${value}` : `${field} ≤ ${value}`;
}

function emptyOpChip(field: string, token: string): string {
  if (token === "empty") {
    return formatFilterChip(field, defaultLabels.opEmpty);
  }
  if (token === "notEmpty") {
    return formatFilterChip(field, defaultLabels.opNotEmpty);
  }
  return "";
}

/**
 * Derive the full runtime (URL keys, chips, predicate) from definitions.
 *
 * @internal
 */
export function buildFilterRuntime<TRow>(
  defs: readonly FilterDef<TRow>[],
  registry: FilterTypeRegistry
): FilterRuntime<TRow> {
  const arrayExtraKeys: string[] = [];
  const numberExtraKeys: string[] = [];
  const filterLabels: Record<string, ChipLabelResolver> = {};
  const predicates = defs.map((def) => filterPredicate(def, registry));

  for (const def of defs) {
    const spec = registry.get(def.type);
    if (!spec) continue;
    if (spec.urlArray) arrayExtraKeys.push(def.key);
    if (spec.urlNumberKeys) {
      const s = RANGE_SUFFIXES.numberRange;
      numberExtraKeys.push(def.key + s.start, def.key + s.end);
    }
    Object.assign(filterLabels, spec.chips(def));
  }

  return {
    defs,
    arrayExtraKeys,
    numberExtraKeys,
    filterLabels,
    filterFn: (row, extra) => predicates.every((p) => p(row, extra)),
    registry,
  };
}

/**
 * The cleared state for every key a definition list owns.
 *
 * @internal
 */
export function clearedFilterExtras<TRow>(
  defs: readonly FilterDef<TRow>[],
  registry?: FilterTypeRegistry
): ExtraFilters {
  const out: Record<string, FilterValue> = {};
  for (const def of defs) {
    for (const key of filterStateKeys(def, registry)) out[key] = undefined;
  }
  return out;
}

/**
 * Materialize `"auto"` option sources from the data: the distinct values of
 * each such definition's row projection, sorted, capped at
 * {@link AUTO_OPTIONS_LIMIT}. Static arrays and async loaders pass through
 * untouched. Run BEFORE {@link buildFilterRuntime} so chips can label the
 * derived values.
 *
 * @internal
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

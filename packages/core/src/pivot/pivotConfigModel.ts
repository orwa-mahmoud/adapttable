/**
 * Editing a pivot configuration: which field sits on which axis, in what
 * order, and what each measure computes.
 *
 * This is the part of the configuration UI that is not a widget. Every kit
 * draws the panel differently, but "move Team from Available to Rows, above
 * Region" is one answer everywhere — so it is decided here, once, and the
 * adapters are left with buttons.
 *
 * The operations are deliberately total: moving a field that is already on
 * an axis takes it off the old one rather than duplicating it, moving to an
 * index past the end appends, and moving a field that does not exist changes
 * nothing. A configuration panel whose buttons can produce an invalid pivot
 * is a panel that will produce one.
 *
 * Measures are the exception to "a field lives on one axis": the same column
 * can be summed and counted in the same pivot, so measures are keyed by
 * their position rather than by their column.
 */
import type { AggregateName } from "../aggregate/aggregate";
import type { PivotConfig, PivotMeasure } from "./pivotModel";

/**
 * Where a field can sit.
 *
 * @internal
 */
export type PivotZone = "rows" | "columns" | "measures";

/**
 * The zones a field can be moved between, in panel order.
 *
 * @internal
 */
export const PIVOT_ZONES: readonly PivotZone[] = [
  "rows",
  "columns",
  "measures",
];

/**
 * A field the user can put on an axis.
 *
 * @internal
 */
export interface PivotField {
  /** The column key. */
  key: string;
  /** What to call it in the panel. */
  label: string;
}

/**
 * An empty configuration — nothing on any axis.
 *
 * @internal
 */
export const EMPTY_PIVOT_CONFIG: PivotConfig = {
  rows: [],
  columns: [],
  measures: [],
};

/**
 * The fields not yet used on either axis.
 *
 * @internal
 */
export function availableFields(
  fields: readonly PivotField[],
  config: PivotConfig
): PivotField[] {
  const used = new Set([...config.rows, ...config.columns]);
  return fields.filter((field) => !used.has(field.key));
}

/** Move a key within a list, or insert it, returning a new list. */
function placed(list: readonly string[], key: string, index: number): string[] {
  const without = list.filter((existing) => existing !== key);
  const at = Math.min(Math.max(index, 0), without.length);
  return [...without.slice(0, at), key, ...without.slice(at)];
}

/**
 * Put a field on an axis.
 *
 * @param config - The configuration to change.
 * @param key - The column key to place.
 * @param zone - Where it should go.
 * @param index - Position within that zone. Past the end appends.
 * @returns A new configuration.
 *
 * @internal
 */
export function assignField(
  config: PivotConfig,
  key: string,
  zone: PivotZone,
  index = Number.MAX_SAFE_INTEGER
): PivotConfig {
  if (zone === "measures") {
    // A measure is not an axis slot: the same column can be summed and
    // counted at once, so this adds rather than moves.
    const measures = [...config.measures];
    const at = Math.min(Math.max(index, 0), measures.length);
    measures.splice(at, 0, { key, agg: "sum" });
    return { ...config, measures };
  }
  // A dimension lives on one axis only — placing it on the other takes it
  // off the first, rather than pivoting the same field twice.
  const other = zone === "rows" ? "columns" : "rows";
  return {
    ...config,
    [zone]: placed(config[zone], key, index),
    [other]: config[other].filter((existing) => existing !== key),
  };
}

/**
 * Take a field off an axis.
 *
 * @param config - The configuration to change.
 * @param zone - Which axis to remove from.
 * @param index - The position to remove.
 * @returns A new configuration.
 *
 * @internal
 */
export function removeField(
  config: PivotConfig,
  zone: PivotZone,
  index: number
): PivotConfig {
  if (zone === "measures") {
    return {
      ...config,
      measures: config.measures.filter((_, i) => i !== index),
    };
  }
  return { ...config, [zone]: config[zone].filter((_, i) => i !== index) };
}

/**
 * Move a field one step within its zone.
 *
 * The keyboard counterpart of dragging. A step past either end is a no-op
 * rather than a wrap: wrapping makes the last press of a held key undo the
 * whole journey.
 *
 * @param config - The configuration to change.
 * @param zone - Which axis the field is on.
 * @param index - Its current position.
 * @param delta - `-1` to move it out one level, `1` to move it in.
 * @returns A new configuration.
 *
 * @internal
 */
export function moveField(
  config: PivotConfig,
  zone: PivotZone,
  index: number,
  delta: -1 | 1
): PivotConfig {
  const target = index + delta;
  const list: readonly unknown[] =
    zone === "measures" ? config.measures : config[zone];
  if (index < 0 || index >= list.length) return config;
  if (target < 0 || target >= list.length) return config;
  if (zone === "measures") {
    const measures = [...config.measures];
    const [moved] = measures.splice(index, 1);
    if (moved) measures.splice(target, 0, moved);
    return { ...config, measures };
  }
  const keys = [...config[zone]];
  const [moved] = keys.splice(index, 1);
  if (moved !== undefined) keys.splice(target, 0, moved);
  return { ...config, [zone]: keys };
}

/**
 * Change what a measure computes.
 *
 * @param config - The configuration to change.
 * @param index - Which measure.
 * @param agg - The new aggregation.
 * @returns A new configuration.
 *
 * @internal
 */
export function setMeasureAgg(
  config: PivotConfig,
  index: number,
  agg: AggregateName
): PivotConfig {
  return {
    ...config,
    measures: config.measures.map((measure, i) =>
      i === index ? { ...measure, agg } : measure
    ),
  };
}

/**
 * Whether a configuration can actually be rendered.
 *
 * A pivot with no measure has nothing to put in its cells, which is a
 * half-built configuration rather than an error — the panel shows it and the
 * table waits.
 *
 * @internal
 */
export function isPivotReady(config: PivotConfig): boolean {
  return config.measures.length > 0;
}

/**
 * The display label for one measure, for the panel and the column header.
 *
 * @internal
 */
export function measureLabel(
  measure: PivotMeasure,
  fields: readonly PivotField[]
): string {
  if (measure.label !== undefined) return measure.label;
  const field = fields.find((candidate) => candidate.key === measure.key);
  const name = field?.label ?? measure.key;
  return typeof measure.agg === "string" ? `${measure.agg} ${name}` : name;
}

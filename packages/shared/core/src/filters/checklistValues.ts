/**
 * Distinct checklist values and counts. Widget state lives on
 * `@adapttable/react`.
 */
import { getPath } from "../utils/path";
import type { FilterDef, FilterOption } from "./filterDefs";

/**
 * One distinct value in a checklist, with its count in the current set.
 *
 * @public
 */
export interface ChecklistValue {
  /** The value itself. */
  value: string;
  /** Caption shown for the entry. */
  label: string;
  /** How many rows carry this value. */
  count: number;
}

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

function optionLabel(options: FilterDef["options"], value: string): string {
  if (!Array.isArray(options)) return value;
  const list: readonly FilterOption[] = options;
  return list.find((item) => item.value === value)?.label ?? value;
}

function rowValue<TRow>(def: FilterDef<TRow>, row: TRow): string {
  return valueText(def.getValue ? def.getValue(row) : getPath(row, def.key));
}

/**
 * Distinct values + counts from a row set. Static `options` only supply
 * labels — the values themselves always come from the rows.
 *
 * @public
 */
export function collectChecklistValues<TRow>(
  def: FilterDef<TRow>,
  rows: readonly TRow[],
  selected: readonly string[] = []
): ChecklistValue[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const text = rowValue(def, row);
    if (text === "") continue;
    counts.set(text, (counts.get(text) ?? 0) + 1);
  }
  for (const value of selected) {
    if (value !== "" && !counts.has(value)) counts.set(value, 0);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([value, count]) => ({
      value,
      label: optionLabel(def.options, value),
      count,
    }));
}

/**
 * Excel-style checklist filter — distinct values, counts, search,
 * select-all. Prefers {@link TableSource.facets} (own-filter excluded);
 * falls back to {@link TableSource.allFilteredRows}. A server page that
 * omits both does not offer the widget.
 */
import { useMemo, useState } from "react";

import type { TableSource } from "../source/TableSource";
import type { FilterValue } from "../types";
import { getPath } from "../utils/path";
import type { FilterDef, FilterOption } from "./filterDefs";
import { listFilterValues } from "./filterForm";

/**
 * Window the list once it is long enough that a full render would hitch.
 *
 * @public
 */
export const CHECKLIST_VIRTUALIZE_AT = 40;

/**
 * Fixed row height the virtual window measures against, in px.
 *
 * @public
 */
export const CHECKLIST_ITEM_HEIGHT = 28;

/**
 * Visible viewport of a virtualized list, in px.
 *
 * @public
 */
export const CHECKLIST_LIST_HEIGHT = 240;

/**
 * One distinct value in a checklist, with its count in the current set.
 *
 * @public
 */
export interface ChecklistValue {
  value: string;
  label: string;
  count: number;
}

/**
 * Kit-agnostic state behind {@link useChecklistFilter}.
 *
 * @public
 */
export interface ChecklistFilterState {
  /** False when the source has no full filtered set — do not render. */
  available: boolean;
  /** Distinct values, selected-but-missing ones included at count 0. */
  items: readonly ChecklistValue[];
  /** `items` narrowed by the search box. */
  visible: readonly ChecklistValue[];
  /** Current search box text. */
  query: string;
  setQuery: (next: string) => void;
  /** Currently checked values. */
  selected: readonly string[];
  /** True when `visible` is long enough to window. */
  virtualize: boolean;
  selectAllVisible: () => void;
  clear: () => void;
  toggle: (value: string, on: boolean) => void;
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

function selectedList(value: FilterValue): string[] {
  return listFilterValues(value);
}

/**
 * Derive the checklist from `source.facets` or `source.allFilteredRows`.
 * Returns `available: false` when both are missing so a server page
 * never pretends it can count a set it does not hold.
 *
 * @public
 */
export function useChecklistFilter<TRow>(
  def: FilterDef<TRow>,
  source: Pick<
    TableSource<TRow>,
    "allFilteredRows" | "extra" | "setExtra" | "facets"
  >
): ChecklistFilterState {
  const fromFacets = source.facets?.[def.key];
  const rows = source.allFilteredRows;
  const available = fromFacets !== undefined || rows !== undefined;
  const raw = source.extra[def.key];
  const selected = selectedList(raw);
  const items = useMemo(() => {
    if (fromFacets) return [...fromFacets];
    return rows ? collectChecklistValues(def, rows, selectedList(raw)) : [];
  }, [def, rows, raw, fromFacets]);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (needle === "") return items;
    return items.filter((item) => {
      return (
        item.label.toLowerCase().includes(needle) ||
        item.value.toLowerCase().includes(needle)
      );
    });
  }, [items, needle]);

  const write = (next: readonly string[]) => {
    source.setExtra(def.key, next.length > 0 ? [...next] : undefined);
  };

  return {
    available,
    items,
    visible,
    query,
    setQuery,
    selected,
    virtualize: visible.length >= CHECKLIST_VIRTUALIZE_AT,
    selectAllVisible: () => {
      const next = new Set(selected);
      for (const item of visible) next.add(item.value);
      write([...next]);
    },
    clear: () => write([]),
    toggle: (value, on) => {
      if (on) {
        write(selected.includes(value) ? selected : [...selected, value]);
        return;
      }
      write(selected.filter((item) => item !== value));
    },
  };
}

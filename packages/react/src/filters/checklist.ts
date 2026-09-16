/**
 * Excel-style checklist filter — distinct values, counts, search,
 * select-all. Prefers {@link TableSource.facets} (own-filter excluded);
 * falls back to {@link TableSource.allFilteredRows}. A server page that
 * omits both does not offer the widget.
 */
import {
  type ChecklistValue,
  collectChecklistValues,
  type FilterDef,
  type FilterValue,
  type TableSource,
} from "@adapttable/core";
import { useMemo, useState } from "react";

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

export type { ChecklistValue } from "@adapttable/core";

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
  /** Replaces the checklist's search text. */
  setQuery: (next: string) => void;
  /** Currently checked values. */
  selected: readonly string[];
  /** True when `visible` is long enough to window. */
  virtualize: boolean;
  /** Checks every option the search left visible. */
  selectAllVisible: () => void;
  /** Unchecks every option. */
  clear: () => void;
  /** Checks or unchecks one option. */
  toggle: (value: string, on: boolean) => void;
}

export { collectChecklistValues } from "@adapttable/core";

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

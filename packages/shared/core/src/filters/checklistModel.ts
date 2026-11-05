/**
 * The Excel-style checklist filter — distinct values, counts, search,
 * select-all — and the window that keeps a long list cheap to render.
 *
 * Values come from {@link TableSource.facets} (own filter excluded) when the
 * source has them, else from {@link TableSource.allFilteredRows}. A server
 * page that carries neither does not offer the widget.
 *
 * The window: a column with two hundred distinct values would render two
 * hundred kit checkboxes into a 240px popover, and every keystroke in the
 * search box would re-render all of them. Windowing keeps that to what a
 * reader can see plus a margin, and holds the rest open with two spacers so
 * the scrollbar still describes the whole list. The list wraps — several
 * options to a row — so the window is computed in ROWS of options, which is
 * why a windowed list gives every option the same width: with a uniform cell
 * the count across is arithmetic on the measured container. Before anything
 * is measured the answer is one per row, which over-renders slightly and is
 * never wrong.
 */
import type { ChecklistValue } from "../contracts/query";
import type { TableSource } from "../source/TableSource";
import { collectChecklistValues } from "./checklistValues";
import type { FilterDef } from "./filterDefs";
import { listFilterValues } from "./filterFormModel";

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
 * Width of one option cell while the list is windowed, in px.
 *
 * @public
 */
export const CHECKLIST_ITEM_WIDTH = 200;

/**
 * Space between option cells, in px — both axes.
 *
 * @public
 */
export const CHECKLIST_OPTION_GAP = 8;

/** Rows rendered either side of the visible span. */
const OVERSCAN_ROWS = 2;

/** Height one row of options occupies, gap included. */
const ROW_HEIGHT = CHECKLIST_ITEM_HEIGHT + CHECKLIST_OPTION_GAP;

/**
 * The source slice a checklist reads and writes.
 *
 * @public
 */
export type ChecklistSource<TRow> = Pick<
  TableSource<TRow>,
  "allFilteredRows" | "extra" | "setExtra" | "facets"
>;

/**
 * The checklist's options, and whether it can offer any.
 *
 * @public
 */
export interface ChecklistItems {
  /** False when the source has no full filtered set — do not render. */
  readonly available: boolean;
  /** Distinct values, selected-but-missing ones included at count 0. */
  readonly items: readonly ChecklistValue[];
}

/**
 * The checklist's options: the source's facets for the column, or the
 * distinct values of every filtered row.
 *
 * @param def - The filter definition.
 * @param source - The source slice.
 * @returns The options and whether the source can supply them.
 *
 * @public
 */
export function checklistItems<TRow>(
  def: FilterDef<TRow>,
  source: Pick<ChecklistSource<TRow>, "allFilteredRows" | "extra" | "facets">
): ChecklistItems {
  const fromFacets = source.facets?.[def.key];
  if (fromFacets) return { available: true, items: [...fromFacets] };
  const rows = source.allFilteredRows;
  if (!rows) return { available: false, items: [] };
  return {
    available: true,
    items: collectChecklistValues(
      def,
      rows,
      listFilterValues(source.extra[def.key])
    ),
  };
}

/**
 * The options a search leaves visible, matched on label or value, ignoring
 * case and surrounding space.
 *
 * @param items - Every option.
 * @param query - The search box text.
 * @returns The matching options; `items` itself for an empty search.
 *
 * @public
 */
export function searchChecklistItems(
  items: readonly ChecklistValue[],
  query: string
): readonly ChecklistValue[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return items;
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(needle) ||
      item.value.toLowerCase().includes(needle)
  );
}

/**
 * The checklist's edits.
 *
 * @public
 */
export interface ChecklistActions {
  /** Checks every option the search left visible. */
  readonly selectAllVisible: () => void;
  /** Unchecks every option. */
  readonly clear: () => void;
  /** Checks or unchecks one option. */
  readonly toggle: (value: string, on: boolean) => void;
}

/**
 * The checklist's edits. Each writes the column's value list; an empty list
 * clears the filter.
 *
 * @param def - The filter definition.
 * @param source - The source slice.
 * @param visible - The options the search leaves visible.
 * @returns The edits.
 *
 * @public
 */
export function checklistActions<TRow>(
  def: FilterDef<TRow>,
  source: Pick<ChecklistSource<TRow>, "extra" | "setExtra">,
  visible: readonly ChecklistValue[]
): ChecklistActions {
  const selected = listFilterValues(source.extra[def.key]);
  const write = (next: readonly string[]): void => {
    source.setExtra(def.key, next.length > 0 ? [...next] : undefined);
  };
  return {
    selectAllVisible() {
      const next = new Set(selected);
      for (const item of visible) next.add(item.value);
      write([...next]);
    },
    clear: () => write([]),
    toggle(value, on) {
      if (on) {
        write(selected.includes(value) ? selected : [...selected, value]);
        return;
      }
      write(selected.filter((item) => item !== value));
    },
  };
}

/**
 * The slice of a windowed checklist to render and the space the rest of the
 * list occupies.
 *
 * @public
 */
export interface ChecklistWindow {
  /** Index of the first option to render. */
  start: number;
  /** Index one past the last option to render. */
  end: number;
  /** Height of the spacer before the window, in px. */
  padTop: number;
  /** Height of the spacer after it, in px. */
  padBottom: number;
}

/**
 * How many uniform option cells fit across a container of this width.
 *
 * @param width - The list's measured width, in px.
 * @returns At least one.
 *
 * @public
 */
export function checklistColumnsAcross(width: number): number {
  if (width <= 0) return 1;
  const each = CHECKLIST_ITEM_WIDTH + CHECKLIST_OPTION_GAP;
  return Math.max(1, Math.floor((width + CHECKLIST_OPTION_GAP) / each));
}

/**
 * The window over `count` options at a scroll position.
 *
 * @param count - How many options the list holds.
 * @param scrollTop - The list's scroll offset, in px.
 * @param width - The list's measured width, in px.
 * @returns The slice to render and the spacers around it.
 *
 * @public
 */
export function checklistWindow(
  count: number,
  scrollTop: number,
  width: number
): ChecklistWindow {
  const columns = checklistColumnsAcross(width);
  const rowCount = Math.ceil(count / columns);
  const visibleRows = Math.ceil(CHECKLIST_LIST_HEIGHT / ROW_HEIGHT);
  const startRow = Math.max(
    0,
    Math.min(
      Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS,
      Math.max(0, rowCount - visibleRows)
    )
  );
  const endRow = Math.min(rowCount, startRow + visibleRows + OVERSCAN_ROWS * 2);
  return {
    start: startRow * columns,
    end: Math.min(count, endRow * columns),
    padTop: startRow * ROW_HEIGHT,
    padBottom: Math.max(0, (rowCount - endRow) * ROW_HEIGHT),
  };
}

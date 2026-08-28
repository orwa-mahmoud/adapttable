/**
 * What a context menu offers, and for what.
 *
 * A right-click means something different depending on where it lands. On a
 * header it means "do something to this column" — sort it, pin it, hide it.
 * On a cell it means "do something with this data" — copy it, cut it. The
 * menu is the same widget either way, so the difference lives here, in a
 * model that turns a target into a list of entries.
 *
 * The entries are data, not components. That is what lets the same list
 * drive a right-click menu, a keyboard menu opened with Shift+F10, and — in
 * #335 — a command palette, without any of them owning the actions.
 *
 * Nothing here reaches for the clipboard or changes a column itself. Every
 * entry carries an `onSelect` the caller wired, because the table asks and
 * the host does; that rule does not stop being true because the request
 * arrived from a menu.
 */
import type { ColumnDef, TableLabels } from "../types";

/**
 * Where the menu was opened.
 *
 * @public
 */
export type ContextMenuTarget<TRow> =
  | { kind: "header"; columnKey: string }
  | { kind: "row"; row: TRow; rowId: string }
  | { kind: "cell"; row: TRow; rowId: string; columnKey: string };

/**
 * One entry in a context menu.
 *
 * @public
 */
export interface ContextMenuItem {
  /** Stable identity, and the React key. */
  key: string;
  /** The caption, already localized. */
  label: string;
  /** Greyed and unselectable, but still announced — the menu keeps its shape. */
  disabled?: boolean;
  /** Destructive, so a kit can colour it as such. */
  danger?: boolean;
  /** Draw a divider above this entry. */
  separatorBefore?: boolean;
  /** What selecting it does. The menu closes first, then this runs. */
  onSelect: () => void;
}

/**
 * The handlers a built-in entry needs, each optional.
 *
 * @internal
 */
export interface ContextMenuActions<TRow> {
  /** Copy the selection, or this cell when nothing is selected. */
  onCopy?: (target: ContextMenuTarget<TRow>) => void;
  /** Cut — present only when the host wired `onCellCut`. */
  onCut?: (target: ContextMenuTarget<TRow>) => void;
  /** Sort by a column. */
  onSort?: (columnKey: string, direction: "asc" | "desc") => void;
  /** Toggle a column's pin. */
  onTogglePin?: (columnKey: string) => void;
  /** Hide a column. */
  onHide?: (columnKey: string) => void;
  /** Open the filter UI on a column. */
  onFilter?: (columnKey: string) => void;
}

/** What {@link contextMenuItems} needs to decide the entries. */
export interface ContextMenuModelOptions<TRow> {
  /** What the menu was opened on. */
  target: ContextMenuTarget<TRow>;
  /** Visible columns, in order. */
  columns: readonly ColumnDef<TRow>[];
  /** Label overrides; gaps fall back to English. */
  labels: TableLabels;
  /** Actions to offer. */
  actions: ContextMenuActions<TRow>;
  /** Which column is sorted, so the current direction can be marked. */
  sortBy?: string;
  /** Whether the sorted column is ascending. */
  sortDir?: "asc" | "desc";
  /** Whether the column is currently pinned, for the pin entry's wording. */
  isPinned?: (columnKey: string) => boolean;
  /**
   * Extra entries from the host. They are appended, with a divider, so a
   * custom action can never be mistaken for a built-in one — and cannot
   * silently take the place of a built-in that moved.
   */
  extra?: (target: ContextMenuTarget<TRow>) => readonly ContextMenuItem[];
}

function columnFor<TRow>(
  columns: readonly ColumnDef<TRow>[],
  key: string
): ColumnDef<TRow> | undefined {
  return columns.find((column) => column.key === key);
}

/** The entries a header's menu offers for its column. */
function headerItems<TRow>(
  columnKey: string,
  options: ContextMenuModelOptions<TRow>
): ContextMenuItem[] {
  const { actions, labels } = options;
  const column = columnFor(options.columns, columnKey);
  if (!column) return [];
  const items: ContextMenuItem[] = [];
  if (actions.onSort && column.sortable) {
    const sorted = options.sortBy === columnKey;
    items.push(
      {
        key: "sort-asc",
        label: labels.sortAscending ?? "Sort ascending",
        disabled: sorted && options.sortDir === "asc",
        onSelect: () => {
          actions.onSort?.(columnKey, "asc");
        },
      },
      {
        key: "sort-desc",
        label: labels.sortDescending ?? "Sort descending",
        disabled: sorted && options.sortDir === "desc",
        onSelect: () => {
          actions.onSort?.(columnKey, "desc");
        },
      }
    );
  }
  if (actions.onFilter && column.filter) {
    items.push({
      key: "filter",
      label: labels.filterColumn ?? "Filter column",
      separatorBefore: items.length > 0,
      onSelect: () => {
        actions.onFilter?.(columnKey);
      },
    });
  }
  if (actions.onTogglePin && column.lockPin !== true) {
    items.push({
      key: "pin",
      label: options.isPinned?.(columnKey)
        ? (labels.unpin ?? "Unpin")
        : (labels.pinStart ?? "Pin to start"),
      separatorBefore: items.length > 0,
      onSelect: () => {
        actions.onTogglePin?.(columnKey);
      },
    });
  }
  if (actions.onHide && column.lockVisibility !== true) {
    items.push({
      key: "hide",
      label: labels.hideColumn ?? "Hide column",
      onSelect: () => {
        actions.onHide?.(columnKey);
      },
    });
  }
  return items;
}

/** The entries a row's or a cell's menu offers for the data under it. */
function dataItems<TRow>(
  target: ContextMenuTarget<TRow>,
  options: ContextMenuModelOptions<TRow>
): ContextMenuItem[] {
  const { actions, labels } = options;
  const items: ContextMenuItem[] = [];
  if (actions.onCopy) {
    items.push({
      key: "copy",
      label: labels.copyCells ?? "Copy",
      onSelect: () => {
        actions.onCopy?.(target);
      },
    });
  }
  if (actions.onCut) {
    items.push({
      key: "cut",
      label: labels.cutCells ?? "Cut",
      onSelect: () => {
        actions.onCut?.(target);
      },
    });
  }
  return items;
}

/**
 * The entries for one target.
 *
 * An empty list means there is no menu to open — which is the answer when
 * every action a target could offer is either unwired or locked, and the
 * reason a caller should check before showing anything.
 *
 * @param options - The target, the columns, the labels and the handlers.
 * @returns The entries, in display order.
 */
export function contextMenuItems<TRow>(
  options: ContextMenuModelOptions<TRow>
): ContextMenuItem[] {
  const { target } = options;
  const built =
    target.kind === "header"
      ? headerItems(target.columnKey, options)
      : dataItems(target, options);
  const extra = options.extra?.(target) ?? [];
  if (extra.length === 0) return built;
  return [
    ...built,
    ...extra.map((item, index) => ({
      ...item,
      separatorBefore: index === 0 ? built.length > 0 : item.separatorBefore,
    })),
  ];
}

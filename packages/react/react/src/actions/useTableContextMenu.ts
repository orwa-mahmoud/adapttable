/**
 * One hook that turns composed context-menu configuration into something an
 * adapter can bind.
 *
 * The pieces already exist separately — the routes in, the target read back
 * out of the DOM, the entries a target deserves — and each is separately
 * testable, which is why they are separate. But an adapter should not have
 * to assemble them: eight kits assembling the same four calls is eight
 * chances to bind the pointer handlers and forget the keyboard ones, which
 * is the failure this whole feature exists to avoid.
 *
 * So this composes them into two things. `regionProps` goes on whatever
 * element contains the headers, rows and cells. `menu` is everything the
 * chrome needs. There is no third thing to remember.
 */
import {
  composeContextMenuExtra,
  type ContextMenuActions,
  type ContextMenuItem,
  contextMenuItems,
  type ContextMenuTarget,
  type FeatureHostState,
  isContextMenuArmed,
  type RowAction,
  type TableLabels,
} from "@adapttable/core";
import { useMemo } from "react";

import type { ColumnDef } from "../columnDef";
import { useFeatureHost } from "../features/featureHostContext";
import { type ContextMenuPoint, useContextMenuOpen } from "./useContextMenu";

/**
 * How a host arms the context menu.
 *
 * @public
 */
export interface ContextMenuOptions<TRow> {
  /**
   * Extra entries, appended behind a divider so a custom action is never
   * mistaken for a built-in one.
   */
  items?: (target: ContextMenuTarget<TRow>) => readonly ContextMenuItem[];
}

/**
 * What {@link useTableContextMenu} needs.
 *
 * @public
 */
export interface TableContextMenuOptions<TRow> {
  /** The prop as the host wrote it: `true`, an options object, or absent. */
  contextMenu?: boolean | ContextMenuOptions<TRow>;
  /** Visible columns, in order. */
  columns: readonly ColumnDef<TRow>[];
  /** Label overrides; gaps fall back to English. */
  labels: TableLabels;
  /** The row behind an id, since the DOM only carries the id. */
  rowFor: (rowId: string) => TRow | undefined;
  /** The handlers the built-in entries call. */
  actions: ContextMenuActions<TRow>;
  /** Column key currently sorted by, if any. */
  sortBy?: string;
  /** Direction for `sortBy`. */
  sortDir?: "asc" | "desc";
  /** Whether a column is pinned. */
  isPinned?: (columnKey: string) => boolean;
  /**
   * The row pin actions, offered on row and cell menus when `rowPinning()` is
   * composed.
   */
  rowPins?: readonly RowAction<TRow>[];
  /** The host of THIS table. Omit it only under {@link FeatureHostProvider}. */
  featureHost?: FeatureHostState;
}

/**
 * What an adapter binds and renders.
 *
 * @public
 */
export interface TableContextMenu {
  /** Spread onto the element containing the headers, rows and cells. */
  regionProps: Record<string, unknown>;
  /** The entries for whatever is open; empty when nothing is. */
  items: readonly ContextMenuItem[];
  /** Where it was opened, or `null` when it is closed. */
  at: ContextMenuPoint | null;
  /** Close it, putting focus back where it came from. */
  close: () => void;
}

/**
 * Arm a table's context menu.
 *
 * @param options - The prop, the columns, and the handlers behind the
 *   built-in entries.
 * @returns The props to bind and the state to render.
 *
 * @public
 */
export function useTableContextMenu<TRow>(
  options: TableContextMenuOptions<TRow>
): TableContextMenu {
  const {
    contextMenu,
    columns,
    labels,
    rowFor,
    actions,
    sortBy,
    sortDir,
    isPinned,
    rowPins,
  } = options;
  const fromTree = useFeatureHost<TRow>();
  const pluginMenus = (options.featureHost ?? fromTree)?.contextMenuItems;
  const enabled = isContextMenuArmed(contextMenu, pluginMenus);
  const { controller, open } = useContextMenuOpen<TRow>(enabled);

  // One set of handlers for the whole region; each opening route resolves its
  // target from the element the event started at, and the press-tracking
  // routes resolve none.
  const regionProps = useMemo<Record<string, unknown>>(
    () => (enabled ? { ...controller.regionHandlers(rowFor) } : {}),
    [controller, enabled, rowFor]
  );

  const extra = typeof contextMenu === "object" ? contextMenu.items : undefined;
  const items = useMemo(
    () =>
      open
        ? contextMenuItems<TRow>({
            target: open.target,
            columns,
            labels,
            actions,
            sortBy,
            sortDir,
            isPinned,
            rowPins,
            extra: composeContextMenuExtra(extra, pluginMenus),
          })
        : [],
    [
      open,
      columns,
      labels,
      actions,
      sortBy,
      sortDir,
      isPinned,
      rowPins,
      extra,
      pluginMenus,
    ]
  );

  const at = open?.at ?? null;
  return useMemo(
    () => ({ regionProps, items, at, close: controller.close }),
    [regionProps, items, at, controller]
  );
}

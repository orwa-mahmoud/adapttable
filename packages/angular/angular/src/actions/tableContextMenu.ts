import { fromStore } from "@adapttable/angular";
import type { ContextMenuOptions } from "@adapttable/angular/features";
import {
  type ColumnMetadata,
  composeContextMenuExtra,
  type ContextMenuActions,
  type ContextMenuItem,
  contextMenuItems,
  type ContextMenuPoint,
  type ContextMenuRegionHandlers,
  createContextMenuOpenController,
  type FeatureHostState,
  isContextMenuArmed,
  type RowAction,
  type TableLabels,
  withContextMenuCellCopy,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  computed,
  effect,
  inject,
  InjectionToken,
  Injector,
  type Signal,
  type WritableSignal,
} from "@angular/core";

/**
 * The region handlers the table binds, or `null` while no menu is armed.
 *
 * The live menu writes them. The table reads them from the element that
 * contains its headers, rows and cells.
 *
 * @public
 */
export const ADAPTTABLE_CONTEXT_MENU = new InjectionToken<
  WritableSignal<ContextMenuRegionHandlers | null>
>("ADAPTTABLE_CONTEXT_MENU");

/**
 * What {@link injectTableContextMenu} needs.
 *
 * @public
 */
export interface TableContextMenuOptions<TRow> {
  /** The prop as the host wrote it: `true`, an options object, or absent. */
  readonly contextMenu?: boolean | ContextMenuOptions<TRow>;
  /** Visible columns, in order. */
  readonly columns: readonly ColumnMetadata<TRow>[];
  /** Label overrides; gaps fall back to English. */
  readonly labels: TableLabels;
  /** The row behind an id, since the DOM only carries the id. */
  readonly rowFor: (rowId: string) => TRow | undefined;
  /** The handlers the built-in entries call. */
  readonly actions: ContextMenuActions<TRow>;
  /** Column key currently sorted by, if any. */
  readonly sortBy?: string;
  /** Direction for `sortBy`. */
  readonly sortDir?: "asc" | "desc";
  /** Whether a column is pinned. */
  readonly isPinned?: (columnKey: string) => boolean;
  /** The row pin actions, offered on row and cell menus. */
  readonly rowPins?: readonly RowAction<TRow>[];
  /** The host of this table, for entries a feature registered. */
  readonly featureHost?: FeatureHostState;
  /**
   * Whether cell navigation is composed. Off, Copy writes the right-clicked
   * cell; on, Copy uses the grid selection when the click landed in it.
   */
  readonly gridNavigation?: boolean;
}

/**
 * What an adapter binds and renders.
 *
 * @public
 */
export interface TableContextMenu {
  /** Bind once on the element containing the headers, rows and cells. */
  readonly region: ContextMenuRegionHandlers;
  /** The entries for whatever is open; empty when nothing is. */
  readonly items: readonly ContextMenuItem[];
  /** Where it was opened, or `null` when it is closed. */
  readonly at: ContextMenuPoint | null;
  /** Close it, putting focus back where it came from. */
  readonly close: () => void;
}

const EMPTY_REGION: ContextMenuRegionHandlers = {
  onContextMenu: () => undefined,
  onKeyDown: () => undefined,
  onPointerDown: () => undefined,
  onPointerMove: () => undefined,
  onPointerUp: () => undefined,
  onPointerCancel: () => undefined,
};

/**
 * Arm a table's context menu.
 *
 * @param options - The prop, the columns, and the handlers behind the
 *   built-in entries.
 * @param injector - The caller's injector, when this runs outside a
 *   construction context.
 * @returns The props to bind and the state to render.
 *
 * @public
 */
export function injectTableContextMenu<TRow>(
  options: Signal<TableContextMenuOptions<TRow>>,
  injector?: Injector
): Signal<TableContextMenu> {
  if (injector === undefined) assertInInjectionContext(injectTableContextMenu);
  const resolved = injector ?? inject(Injector);
  const controller = createContextMenuOpenController<TRow>({ enabled: false });
  const snapshot = fromStore(controller, { injector: resolved });
  effect(
    () => {
      const current = options();
      controller.configure({
        enabled: isContextMenuArmed(
          current.contextMenu,
          current.featureHost?.contextMenuItems
        ),
      });
    },
    { injector: resolved }
  );
  effect(
    (onCleanup) => {
      onCleanup(controller.connect());
    },
    { injector: resolved }
  );
  return computed(() => {
    const current = options();
    const pluginMenus = current.featureHost?.contextMenuItems;
    const armed = isContextMenuArmed(current.contextMenu, pluginMenus);
    const open = armed ? snapshot().open : null;
    const extra =
      typeof current.contextMenu === "object"
        ? current.contextMenu.items
        : undefined;
    const actions = withContextMenuCellCopy(
      current.actions,
      current.columns,
      current.gridNavigation === true
    );
    return {
      region: armed ? controller.regionHandlers(current.rowFor) : EMPTY_REGION,
      items: open
        ? contextMenuItems({
            target: open.target,
            columns: current.columns,
            labels: current.labels,
            actions,
            sortBy: current.sortBy,
            sortDir: current.sortDir,
            isPinned: current.isPinned,
            rowPins: current.rowPins,
            extra: composeContextMenuExtra(extra, pluginMenus),
          })
        : [],
      at: open?.at ?? null,
      close: controller.close,
    };
  });
}

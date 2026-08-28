/**
 * One hook that turns the `contextMenu` prop into something an adapter can
 * bind.
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
import { useCallback, useMemo } from "react";

import type { FeatureHostState } from "../features/currentHost";
import { useFeatureHost } from "../features/featureHostContext";
import type { ColumnDef, TableLabels } from "../types";
import {
  type ContextMenuActions,
  type ContextMenuItem,
  contextMenuItems,
  type ContextMenuTarget,
} from "./contextMenuModel";
import { resolveContextTarget } from "./contextMenuRegion";
import { type ContextMenuPoint, useContextMenu } from "./useContextMenu";

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

/** What {@link useTableContextMenu} needs. */
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
  /** The host of THIS table. Omit it only under {@link FeatureHostProvider}. */
  featureHost?: FeatureHostState;
}

/**
 * What an adapter binds and renders.
 *
 * @internal
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
 * @internal
 */
export function useTableContextMenu<TRow>(
  options: TableContextMenuOptions<TRow>
): TableContextMenu {
  const fromTree = useFeatureHost<TRow>();
  const pluginMenus = (options.featureHost ?? fromTree)?.contextMenuItems;
  const enabled =
    options.contextMenu !== false &&
    (options.contextMenu !== undefined || Boolean(pluginMenus?.length));
  const menu = useContextMenu<TRow>(enabled);
  const { rowFor } = options;

  // The region's handlers are the trigger's, with the target resolved from
  // whatever the event started at rather than fixed at bind time.
  const forEvent = useCallback(
    <E extends { target: EventTarget | null }>(
      event: E,
      run: (
        props: ReturnType<typeof menu.triggerProps>,
        element: Element
      ) => void
    ) => {
      const from = event.target;
      if (!(from instanceof Element)) return;
      const found = resolveContextTarget<TRow>(from, rowFor);
      if (!found) return;
      run(menu.triggerProps(found.target), found.element);
    },
    [menu, rowFor]
  );

  // The press handlers are target-free, so they are taken once rather than
  // rebuilt per event: only the opening routes need to know what was hit.
  const press = useMemo(
    () => menu.triggerProps({ kind: "row", row: undefined as TRow, rowId: "" }),
    [menu]
  );

  const regionProps = useMemo(
    () =>
      enabled
        ? {
            onContextMenu: (event: React.MouseEvent<HTMLElement>) => {
              const prevent = () => {
                event.preventDefault();
              };
              forEvent(event, (props, element) => {
                // Built field by field, never spread: a React synthetic
                // event keeps `clientX` and the rest on its prototype, so
                // `{...event}` yields an object with none of them and a
                // menu that silently never opens.
                props.onContextMenu({
                  preventDefault: prevent,
                  clientX: event.clientX,
                  clientY: event.clientY,
                  currentTarget: element,
                });
              });
            },
            onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
              // The key is checked BEFORE the target is resolved. This fires
              // on every keystroke in the table, typing in a cell editor
              // included, and resolving a target first would put a DOM walk
              // behind each one — the same mistake the pointer handlers made.
              const opens =
                event.key === "ContextMenu" ||
                (event.shiftKey && event.key === "F10");
              if (!opens) return;
              const prevent = () => {
                event.preventDefault();
              };
              forEvent(event, (props, element) => {
                props.onKeyDown({
                  key: event.key,
                  shiftKey: event.shiftKey,
                  preventDefault: prevent,
                  currentTarget: element,
                });
              });
            },
            onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
              forEvent(event, (props, element) => {
                props.onPointerDown({
                  pointerType: event.pointerType,
                  clientX: event.clientX,
                  clientY: event.clientY,
                  currentTarget: element,
                });
              });
            },
            // These three need no target, so they must not resolve one.
            // `onPointerMove` fires on every mouse movement across the whole
            // table, and a `closest()` walk per movement made a browser test
            // suite six times slower before this was noticed.
            onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
              press.onPointerMove({
                clientX: event.clientX,
                clientY: event.clientY,
              });
            },
            onPointerUp: press.onPointerUp,
            onPointerCancel: press.onPointerCancel,
          }
        : {},
    [enabled, forEvent, press]
  );

  const items = useMemo(() => {
    if (!menu.open) return [];
    const extra =
      typeof options.contextMenu === "object"
        ? options.contextMenu.items
        : undefined;
    const plugins = extra
      ? pluginMenus?.filter((factory) => factory !== extra)
      : pluginMenus;
    const itemsFor = plugins?.length
      ? (target: ContextMenuTarget<TRow>) => [
          ...(extra?.(target) ?? []),
          ...plugins.flatMap((factory) => [...factory(target)]),
        ]
      : extra;
    return contextMenuItems<TRow>({
      target: menu.open.target,
      columns: options.columns,
      labels: options.labels,
      actions: options.actions,
      sortBy: options.sortBy,
      sortDir: options.sortDir,
      isPinned: options.isPinned,
      extra: itemsFor,
    });
  }, [menu.open, options, pluginMenus]);

  return { regionProps, items, at: menu.open?.at ?? null, close: menu.close };
}

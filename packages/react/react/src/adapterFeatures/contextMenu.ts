import { clipboardRangeText, writeClipboardText } from "@adapttable/core";
import { createElement, Fragment, type ReactNode } from "react";

import type { ContextMenuChromeProps } from "../actions/ContextMenuChrome";
import {
  type ContextMenuOptions,
  useTableContextMenu,
} from "../actions/useTableContextMenu";
import { contextMenu as coreContextMenu } from "../features/factories";
import {
  extendFeature,
  slotRender,
  useFeatureSlotFilled,
} from "../features/providers";
import {
  CONTEXT_MENU_LIVE,
  type ContextMenuLiveSlotProps,
  GRID_FOCUS_ANNOUNCER,
} from "../features/slotKeys";
import type { TableFeature } from "../features/tableFeature";
import type { AdapterFeatureComponent } from "./component";

type MenuOptions = Omit<
  ContextMenuLiveSlotProps<never>,
  "children" | "container"
>;
type MenuTarget = Parameters<NonNullable<MenuOptions["actions"]["onCopy"]>>[0];

/**
 * Copy the one cell a context menu was opened over.
 *
 * Without cell navigation there is no grid address and no range, but the
 * target already names the row and the column, which is all a single cell
 * needs. The text is the cell's export value, as a range copy writes it.
 */
function copyTargetCell(options: MenuOptions, target: MenuTarget): void {
  if (target.kind !== "cell") return;
  const column = options.columns.find((item) => item.key === target.columnKey);
  if (!column) return;
  const text = clipboardRangeText({
    range: { anchor: { row: 0, col: 0 }, head: { row: 0, col: 0 } },
    rows: [target.row],
    columns: [column],
  });
  // The menu has closed and nothing announces a result without cell
  // navigation; a refused clipboard leaves the clipboard as it was.
  void writeClipboardText(text);
}

/**
 * The menu's options, with Copy acting on the right-clicked cell when there
 * is no grid selection for it to act on.
 */
function withCellCopy(
  options: MenuOptions,
  gridNavigation: boolean
): MenuOptions {
  if (gridNavigation || !options.actions.onCopy) return options;
  return {
    ...options,
    actions: {
      ...options.actions,
      onCopy: (target) => {
        copyTargetCell(options, target);
      },
    },
  };
}

/**
 * Props shared assembly passes to a kit-owned context menu.
 *
 * @public
 */
export type AdapterContextMenuProps = Omit<ContextMenuChromeProps, "slots">;

/**
 * A context-menu factory bound to one kit's menu component.
 *
 * @public
 */
export type AdapterContextMenuFeature = <TRow>(
  options?: boolean | ContextMenuOptions<TRow>
) => TableFeature<TRow>;

/**
 * Bind the context-menu hook and root-region handlers to kit-owned chrome.
 *
 * @public
 */
export function createAdapterContextMenuFeature(
  ContextMenu: AdapterFeatureComponent<AdapterContextMenuProps>
): AdapterContextMenuFeature {
  function LiveContextMenu({
    children,
    container,
    ...hookOptions
  }: Readonly<ContextMenuLiveSlotProps<never>>): ReactNode {
    // Copy acts on the grid's selection when `cellNavigation()` is composed,
    // and on the right-clicked cell when it is not.
    const gridNavigation = useFeatureSlotFilled(GRID_FOCUS_ANNOUNCER);
    const menu = useTableContextMenu(withCellCopy(hookOptions, gridNavigation));
    return createElement(
      Fragment,
      null,
      children(menu.regionProps),
      createElement(ContextMenu, {
        items: menu.items,
        at: menu.at,
        onClose: menu.close,
        container: container ?? undefined,
        labels: hookOptions.labels,
      })
    );
  }

  const renders = [
    slotRender(CONTEXT_MENU_LIVE, (props) =>
      createElement(LiveContextMenu, props)
    ),
  ];

  return <TRow>(
    options: boolean | ContextMenuOptions<TRow> = true
  ): TableFeature<TRow> =>
    extendFeature(coreContextMenu<TRow>(options), renders);
}

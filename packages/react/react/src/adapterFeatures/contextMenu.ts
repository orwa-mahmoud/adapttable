import { withContextMenuCellCopy } from "@adapttable/core/binding";
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
  ContextMenuLiveSlotProps<unknown>,
  "children" | "container"
>;
/**
 * The menu's options, with Copy acting on the right-clicked cell when there
 * is no grid selection for it to act on.
 */
function withCellCopy(
  options: MenuOptions,
  gridNavigation: boolean
): MenuOptions {
  const actions = withContextMenuCellCopy(
    options.actions,
    options.columns,
    gridNavigation
  );
  return actions === options.actions ? options : { ...options, actions };
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
  }: Readonly<ContextMenuLiveSlotProps<unknown>>): ReactNode {
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

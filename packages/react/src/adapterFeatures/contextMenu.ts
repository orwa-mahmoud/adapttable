import { createElement, Fragment, type ReactNode } from "react";

import type { ContextMenuChromeProps } from "../actions/ContextMenuChrome";
import {
  type ContextMenuOptions,
  useTableContextMenu,
} from "../actions/useTableContextMenu";
import { contextMenu as coreContextMenu } from "../features/factories";
import { extendFeature, slotRender } from "../features/providers";
import {
  CONTEXT_MENU_LIVE,
  type ContextMenuLiveSlotProps,
} from "../features/slotKeys";
import type { TableFeature } from "../features/tableFeature";
import type { AdapterFeatureComponent } from "./component";

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
    const menu = useTableContextMenu(hookOptions);
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

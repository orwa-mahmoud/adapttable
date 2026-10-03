/**
 * The context menu — `@adapttable/angular-cdk/context-menu`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  CONTEXT_MENU_LIVE,
  contextMenu as bindingContextMenu,
  type ContextMenuOptions,
  extendFeature,
  slotRender,
} from "@adapttable/angular";

import { AdaptContextMenuLive } from "./menu";

export {
  AdaptContextMenuItem,
  AdaptContextMenuLive,
  AdaptContextMenuSeparator,
  AdaptContextMenuSurface,
} from "./menu";

/**
 * Right-click menus on cells, rows and headers, with a native menu.
 *
 * @param options - `true`, or {@link ContextMenuOptions}. `items` appends the
 *   host's own entries behind a divider.
 * @returns The feature.
 *
 * @public
 */
export function contextMenu<TRow>(
  options: boolean | ContextMenuOptions<TRow> = true
): AdaptTableFeature {
  return extendFeature(bindingContextMenu(options), [
    slotRender(CONTEXT_MENU_LIVE, () => AdaptContextMenuLive),
  ]);
}

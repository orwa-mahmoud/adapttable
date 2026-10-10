/**
 * The context menu — `@adapttable/angular-unstyled/context-menu`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import { CONTEXT_MENU_LIVE } from "@adapttable/angular/adapter";
import {
  contextMenu as bindingContextMenu,
  type ContextMenuOptions,
} from "@adapttable/angular/features";

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

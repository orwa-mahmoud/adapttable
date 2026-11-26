/**
 * The keys the command palette's and the context menu's features hand their
 * props' builders under. The table imports only these keys, so the builders
 * stay with the features that bring them.
 */
import { featureStateKey } from "@adapttable/core/binding";

import type { commandPaletteView, contextMenuView } from "./regionViews";

/** The command palette's slot props, from a kit's `commandPalette()`. */
export const COMMAND_PALETTE_VIEW = featureStateKey<typeof commandPaletteView>(
  "command-palette-view"
);

/** The context menu's slot props, from a kit's `contextMenu()`. */
export const CONTEXT_MENU_VIEW =
  featureStateKey<typeof contextMenuView>("context-menu-view");

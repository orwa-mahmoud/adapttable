/**
 * The command palette — `@adapttable/angular-aria/command-palette`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import {
  COMMAND_PALETTE_LIVE,
  TOOLBAR_EXTRAS,
} from "@adapttable/angular/adapter";
import {
  commandPalette as bindingCommandPalette,
  type CommandPaletteOptions,
} from "@adapttable/angular/features";

import { AdaptCommandPaletteButton, AdaptCommandPaletteLive } from "./palette";

export { AdaptCommandPaletteButton, AdaptCommandPaletteLive };

/**
 * The command palette, with a native dialog, search box and rows.
 *
 * `button: true` also draws a control among the toolbar's view controls.
 *
 * @param options - `true`, or {@link CommandPaletteOptions}. `button` draws
 *   the toolbar control. Off by default.
 * @returns The feature.
 *
 * @public
 */
export function commandPalette(
  options: boolean | CommandPaletteOptions = true
): AdaptTableFeature {
  const config = typeof options === "object" ? options : undefined;
  return extendFeature(bindingCommandPalette(options), [
    slotRender(COMMAND_PALETTE_LIVE, () => AdaptCommandPaletteLive),
    ...(config?.button === true
      ? [
          slotRender(TOOLBAR_EXTRAS, () => AdaptCommandPaletteButton, {
            orderAs: "command-palette",
          }),
        ]
      : []),
  ]);
}

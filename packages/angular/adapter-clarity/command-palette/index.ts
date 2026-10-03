/**
 * The command palette — `@adapttable/clarity/command-palette`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  COMMAND_PALETTE_LIVE,
  commandPalette as bindingCommandPalette,
  type CommandPaletteOptions,
  extendFeature,
  slotRender,
  TOOLBAR_EXTRAS,
} from "@adapttable/angular";

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

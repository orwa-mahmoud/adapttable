import { createElement } from "react";

import type { CommandPaletteChromeProps } from "../actions/CommandPaletteChrome";
import {
  type CommandPaletteOptions,
  useCommandPalette,
  type UseCommandPaletteOptions,
} from "../actions/useCommandPalette";
import { commandPalette as coreCommandPalette } from "../features/factories";
import { extendFeature, slotRender } from "../features/providers";
import { COMMAND_PALETTE_LIVE } from "../features/slotKeys";
import type { StaticTableFeature } from "../features/tableFeature";
import type { AdapterFeatureComponent } from "./component";

/**
 * Props shared assembly passes to a kit-owned command palette.
 *
 * @public
 */
export type AdapterCommandPaletteProps = Omit<
  CommandPaletteChromeProps,
  "slots"
>;

/**
 * A command-palette factory bound to one kit's dialog and list.
 *
 * @public
 */
export type AdapterCommandPaletteFeature = (
  options?: boolean | CommandPaletteOptions
) => StaticTableFeature;

/**
 * Bind the command-palette hook to one kit's visible dialog.
 *
 * @public
 */
export function createAdapterCommandPaletteFeature(
  CommandPalette: AdapterFeatureComponent<AdapterCommandPaletteProps>
): AdapterCommandPaletteFeature {
  function LiveCommandPalette(props: Readonly<UseCommandPaletteOptions>) {
    const palette = useCommandPalette(props);
    return createElement(CommandPalette, {
      commands: palette.commands,
      open: palette.open,
      onClose: palette.close,
      labels: props.labels,
    });
  }

  const renders = [
    slotRender(COMMAND_PALETTE_LIVE, (props) =>
      createElement(LiveCommandPalette, props)
    ),
  ];

  return (
    options: boolean | CommandPaletteOptions = true
  ): StaticTableFeature => extendFeature(coreCommandPalette(options), renders);
}

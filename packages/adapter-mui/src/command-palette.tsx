import {
  COMMAND_PALETTE,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  commandPalette as core,
  type CommandPaletteOptions,
} from "@adapttable/core/features";

import { CommandPalette } from "./components/CommandPalette";

/**
 * A searchable list of everything the table can do, opened with Ctrl/Cmd+K,
 * drawn with MUI's own dialog and list.
 *
 * @public
 */
export function commandPalette<TRow>(
  options: boolean | CommandPaletteOptions = true
): TableFeature<TRow> {
  return {
    ...core<TRow>(options),
    renders: [
      slotRender(COMMAND_PALETTE, (props) => <CommandPalette {...props} />),
    ],
  };
}

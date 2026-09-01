import {
  COMMAND_PALETTE_LIVE,
  extendFeature,
  slotRender,
  type StaticTableFeature,
  useCommandPalette,
  type UseCommandPaletteOptions,
} from "@adapttable/core/adapter";
import {
  commandPalette as core,
  type CommandPaletteOptions,
} from "@adapttable/core/features";

import { CommandPalette } from "./components/CommandPalette";

function LiveCommandPalette(props: Readonly<UseCommandPaletteOptions>) {
  const palette = useCommandPalette(props);
  return (
    <CommandPalette
      commands={palette.commands}
      open={palette.open}
      onClose={palette.close}
      labels={props.labels}
    />
  );
}

/**
 * A searchable list of everything the table can do, opened with Ctrl/Cmd+K,
 * drawn with MUI's own dialog and list.
 *
 * @public
 */
export function commandPalette(
  options: boolean | CommandPaletteOptions = true
): StaticTableFeature {
  return extendFeature(core(options), [
    slotRender(COMMAND_PALETTE_LIVE, (props) => (
      <LiveCommandPalette {...props} />
    )),
  ]);
}

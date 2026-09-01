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

import { useClassNames } from "./components/classNamesContext";
import { CommandPalette } from "./components/CommandPalette";

function LiveCommandPalette(props: Readonly<UseCommandPaletteOptions>) {
  const palette = useCommandPalette(props);
  const classNames = useClassNames();
  return (
    <CommandPalette
      commands={palette.commands}
      open={palette.open}
      onClose={palette.close}
      labels={props.labels}
      classNames={classNames}
    />
  );
}

/**
 * A searchable list of everything the table can do, opened with Ctrl/Cmd+K,
 * drawn with native controls dialog and list.
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

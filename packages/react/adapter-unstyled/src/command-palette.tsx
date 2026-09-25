import {
  type AdapterCommandPaletteProps,
  createAdapterCommandPaletteFeature,
} from "@adapttable/react/adapter";

import { useClassNames } from "./components/classNamesContext";
import { CommandPalette } from "./components/CommandPalette";
import { CommandPaletteButton } from "./components/toolbarExtras";

function CommandPaletteSlot(props: Readonly<AdapterCommandPaletteProps>) {
  const classNames = useClassNames();
  return <CommandPalette {...props} classNames={classNames} />;
}

/** Add a searchable command palette drawn with native controls. @public */
export const commandPalette = createAdapterCommandPaletteFeature(
  CommandPaletteSlot,
  CommandPaletteButton
);

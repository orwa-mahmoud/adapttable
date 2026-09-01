import {
  type AdapterCommandPaletteProps,
  createAdapterCommandPaletteFeature,
} from "@adapttable/core/adapter";

import { useClassNames } from "./components/classNamesContext";
import { CommandPalette } from "./components/CommandPalette";

function CommandPaletteSlot(props: Readonly<AdapterCommandPaletteProps>) {
  const classNames = useClassNames();
  return <CommandPalette {...props} classNames={classNames} />;
}

/** Add a searchable command palette drawn with native controls. @public */
export const commandPalette =
  createAdapterCommandPaletteFeature(CommandPaletteSlot);

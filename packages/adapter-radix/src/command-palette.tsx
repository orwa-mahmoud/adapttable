import { createAdapterCommandPaletteFeature } from "@adapttable/react/adapter";

import { CommandPalette } from "./components/CommandPalette";

/** Add a searchable command palette drawn with this kit's controls. @public */
export const commandPalette =
  createAdapterCommandPaletteFeature(CommandPalette);

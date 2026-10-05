import type { CommandPaletteSlots } from "@adapttable/vue/command-palette";
import type { ContextMenuSlots } from "@adapttable/vue/context-menu";
import type { ExportSlots } from "@adapttable/vue/export-csv";
import type { SidePanelSlots } from "@adapttable/vue/side-panel";
export const palette: CommandPaletteSlots = {
  Surface: () => null,
  Item: () => null,
  Empty: () => null,
};
export const menu: ContextMenuSlots = {
  Surface: () => null,
  Separator: () => null,
};
export const panel: SidePanelSlots = { Frame: () => null, Tab: () => null };
export const exporting: ExportSlots = { Surface: () => null };

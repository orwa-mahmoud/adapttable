import type {
  CommandPaletteSlots,
  ContextMenuSlots,
  ExportSlots,
  SidePanelSlots,
} from "@adapttable/vue/adapter";
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

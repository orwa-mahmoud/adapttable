import {
  type CommandPaletteSlots,
  type ContextMenuSlots,
  elementRef,
  type ExportSlots,
  type SidePanelSlots,
  toVueAttrs,
} from "@adapttable/vue/adapter";
import { h } from "vue";
export const palette: CommandPaletteSlots = {
  Surface: (p) => h("section", null, [p.children]),
  Input: (p) =>
    h("input", {
      ...toVueAttrs(p.inputProps),
      ref: elementRef(p.inputProps.ref),
    }),
  Item: (p) => h("button", toVueAttrs(p.itemProps), p.command.label),
  Empty: (p) => h("p", p.message),
};
export const menu: ContextMenuSlots = {
  Surface: (p) => h("div", null, [p.children]),
  Item: (p) => h("button", { onClick: p.onSelect }, p.item.label),
  Separator: () => h("hr"),
};
export const panel: SidePanelSlots = {
  Frame: (p) => h("aside", null, [p.children]),
  Tab: (p) => h("button", toVueAttrs(p.buttonProps), p.panel.label),
  Close: (p) => h("button", { onClick: p.onClose }, p.label),
};
export const exporting: ExportSlots = {
  Button: (p) => h("button", p.attrs, p.label),
  Surface: (p) => h("p", p.heading),
};

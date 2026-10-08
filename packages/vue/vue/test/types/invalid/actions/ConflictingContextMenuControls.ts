import type { ContextMenuChromeProps } from "@adapttable/vue/adapter";

export const missing: ContextMenuChromeProps = {
  items: [],
  at: null,
  onClose: () => undefined,
};
export const conflicting: ContextMenuChromeProps = {
  items: [],
  at: null,
  onClose: () => undefined,
  presentation: () => null,
  slots: {
    Surface: () => null,
    Item: () => null,
    Separator: () => null,
  },
};

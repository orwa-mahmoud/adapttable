import { h } from "vue";

import { DataTable } from "../src";
import { savedViews, SavedViewsPanel } from "../src/saved-views";

export function savedViewsFixture(
  onApply: (name: string) => void = () => undefined
) {
  return h("div", [
    h(SavedViewsPanel, {
      views: [
        { name: "Mine", search: "", isDefault: true },
        { name: "Team", search: "", readOnly: true },
      ],
      onApply,
      onRename: () => undefined,
      onMove: () => undefined,
      onSetDefault: () => undefined,
      onRemove: () => undefined,
    }),
    h(DataTable<{ id: string }>, {
      data: [{ id: "a" }],
      columns: [{ key: "id" }],
      rowKey: (row) => row.id,
      urlSync: false,
      forceMobile: false,
      features: [savedViews({ storageKey: "ssr-views", storage: null })],
    }),
  ]);
}

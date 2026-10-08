// @vitest-environment node
import ui from "@nuxt/ui/vue-plugin";
import { expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { savedViews, SavedViewsPanel } from "../src/saved-views";
import { nuxtSavedViewsPanelSlots } from "../src/viewControls/nuxtSavedViewsControls";

it("server-renders populated and empty genuine Nuxt management panels and a closed toolbar without side effects", async () => {
  const callback = vi.fn();
  const owner = vi.fn();
  const slots = nuxtSavedViewsPanelSlots(() => ({}));
  const panelProps = {
    onApply: callback,
    onRename: callback,
    onMove: callback,
    onSetDefault: callback,
    onRemove: callback,
  };
  const html = await renderToString(
    createSSRApp({
      render: () =>
        h("div", [
          h(SavedViewsPanel, {
            ...panelProps,
            views: [
              { name: "Mine", search: "", isDefault: true },
              { name: "Team", search: "", readOnly: true },
            ],
          }),
          h(SavedViewsPanel, { ...panelProps, views: [] }),
          h(DataTable<{ id: string }>, {
            data: [{ id: "one" }],
            columns: [{ key: "id" }],
            rowKey: (row) => row.id,
            urlSync: false,
            forceMobile: false,
            features: [savedViews({ storageKey: "nuxt-ssr", storage: null })],
          }),
          slots.Input({
            label: "Name",
            ref: owner,
            value: "Draft",
            onChange: callback,
            onCommit: callback,
            onCancel: callback,
          }),
        ]),
    }).use(ui)
  );
  expect(html).toContain('data-adapttable-part="saved-views-panel"');
  expect(html).toContain('data-slot="body"');
  expect(html).toContain('data-adapttable-part="saved-view-default"');
  expect(html).toContain('data-adapttable-part="saved-view-readonly"');
  expect(html).toContain('data-adapttable-part="views-button"');
  expect(html).not.toContain('data-adapttable-part="views-panel"');
  expect(html).toContain('value="Draft"');
  expect(owner).not.toHaveBeenCalled();
  expect(callback).not.toHaveBeenCalled();
});

// @vitest-environment node
import UApp from "@nuxt/ui/components/App.vue";
import ui from "@nuxt/ui/vue-plugin";
import { expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { grouping } from "../src/grouping";
import { NuxtRowMoveMenu } from "../src/reorder/NuxtRowMoveMenu";
import { rowReorder } from "../src/row-reorder";

it.each([false, true])(
  "server-renders native reorder controls and closed destinations without callbacks (mobile=%s)",
  async (forceMobile) => {
    const moved = vi.fn();
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(DataTable<{ id: string; team: string }>, {
            data: [
              { id: "a", team: "Core" },
              { id: "b", team: "Design" },
            ],
            columns: [{ key: "id" }, { key: "team" }],
            rowKey: (row) => row.id,
            urlSync: false,
            forceMobile,
            dir: "rtl",
            features: [
              grouping("team"),
              rowReorder(moved, { movePolicy: "confirm", onGroupMove: moved }),
            ],
          }),
      }).use(ui)
    );
    expect(html).toContain(
      `data-adapttable-part="row-reorder-${forceMobile ? "up" : "handle"}"`
    );
    expect(html).toContain('data-slot="base"');
    expect(html).toContain('data-adapttable-part="row-move-menu-trigger"');
    expect(html).not.toContain('data-adapttable-part="row-move-confirmation"');
    expect(html).not.toContain('data-adapttable-part="row-move-menu-content"');
    expect(html).toContain('dir="rtl"');
    expect(moved).not.toHaveBeenCalled();
  }
);

it("renders a supplied native destination trigger on the server without opening a portal or acquiring callbacks", async () => {
  const select = vi.fn();
  const html = await renderToString(
    createSSRApp({
      render: () =>
        h(UApp, { toaster: null }, () =>
          h(NuxtRowMoveMenu, {
            label: "Move to group",
            items: [
              { id: "core", label: "Core", disabled: false, onSelect: select },
            ],
          })
        ),
    }).use(ui)
  );
  expect(html).toContain('data-adapttable-part="row-move-menu-trigger"');
  expect(html).toContain('aria-haspopup="menu"');
  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain("Move to group");
  expect(html).not.toContain('data-adapttable-part="row-move-menu-content"');
  expect(select).not.toHaveBeenCalled();
});

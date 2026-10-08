// @vitest-environment node
import ui from "@nuxt/ui/vue-plugin";
import { expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { commandPalette } from "../src/command-palette";
import { contextMenu } from "../src/context-menu";
import { sidePanel } from "../src/side-panel";

it.each([false, true])(
  "server renders opt-in workspace controls without effects (mobile=%s)",
  async (mobile) => {
    const change = vi.fn();
    const app = createSSRApp({
      render: () =>
        h(DataTable<{ id: string }>, {
          data: [{ id: "one" }],
          columns: [{ key: "id" }],
          rowKey: (row) => row.id,
          urlSync: false,
          forceMobile: mobile,
          dir: "rtl",
          features: [
            commandPalette({ button: true }),
            contextMenu<{ id: string }>(),
            sidePanel({
              open: "one",
              panels: [
                { key: "one", label: "Details", content: "Panel content" },
              ],
              onOpenChange: change,
            }),
          ],
        }),
    }).use(ui);
    const html = await renderToString(app);
    expect(html).toContain('data-adapttable-part="command-palette-button"');
    expect(html).toContain('data-adapttable-part="side-panel"');
    expect(html).toContain("Panel content");
    expect(html).toContain('dir="rtl"');
    expect(html).not.toContain('data-adapttable-part="command-palette"');
    expect(html).not.toContain('data-adapttable-part="context-menu"');
    expect(change).not.toHaveBeenCalled();
  }
);

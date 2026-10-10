// @vitest-environment node
import ui from "@nuxt/ui/vue-plugin";
import { expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { groupingPanel } from "../src/grouping-panel";
it.each([false, true])(
  "server-renders native grouping controls without callbacks (mobile=%s)",
  async (forceMobile) => {
    const notify = vi.fn();
    const app = createSSRApp({
      render: () =>
        h(DataTable<{ id: string; team: string }>, {
          data: [{ id: "a", team: "Core" }],
          columns: [{ key: "team", header: "Team" }],
          rowKey: (row) => row.id,
          urlSync: false,
          forceMobile,
          dir: "rtl",
          features: [groupingPanel(["team"], { onGroupByChange: notify })],
        }),
    }).use(ui);
    const html = await renderToString(app);
    expect(html).toContain('data-adapttable-part="grouping-panel"');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('role="group"');
    expect(html).toContain('dir="rtl"');
    expect(notify).not.toHaveBeenCalled();
  }
);

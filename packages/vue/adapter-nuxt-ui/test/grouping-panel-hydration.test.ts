import ui from "@nuxt/ui/vue-plugin";
import { expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { groupingPanel } from "../src/grouping-panel";
it.each([false, true])(
  "hydrates the genuine grouping chooser in place (mobile=%s)",
  async (forceMobile) => {
    const notify = vi.fn();
    const props = {
      data: [{ id: "a", team: "Core", name: "Ada" }],
      columns: [
        { key: "team", header: "Team" },
        { key: "name", header: "Name" },
      ],
      rowKey: (row: { id: string }) => row.id,
      urlSync: false,
      forceMobile,
      dir: "rtl" as const,
      features: [groupingPanel(["team"], { onGroupByChange: notify })],
    };
    const create = () =>
      createSSRApp({
        render: () =>
          h(DataTable<{ id: string; team: string; name: string }>, props),
      }).use(ui);
    const host = document.createElement("div");
    host.innerHTML = await renderToString(create());
    document.body.append(host);
    const before = host.querySelector('[data-adapttable-part="grouping-add"]');
    expect(before).not.toBeNull();
    const app = create();
    try {
      app.mount(host);
      await nextTick();
      await nextTick();
      expect(host.querySelector('[data-adapttable-part="grouping-add"]')).toBe(
        before
      );
      expect(
        host.querySelectorAll('[data-adapttable-part="grouping-panel"]')
      ).toHaveLength(1);
      expect(notify).not.toHaveBeenCalled();
    } finally {
      app.unmount();
      host.remove();
    }
  }
);

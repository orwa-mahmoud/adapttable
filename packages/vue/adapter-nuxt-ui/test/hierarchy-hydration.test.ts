import type { ColumnDef } from "@adapttable/vue";
import ui from "@nuxt/ui/vue-plugin";
import { expect, it } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { grouping } from "../src/grouping";
import { tree } from "../src/tree";

interface Row {
  id: string;
  name: string;
  team: string;
  parent?: string;
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada", team: "Core" },
  { id: "b", name: "Bea", team: "Core", parent: "a" },
];
const columns: readonly ColumnDef<Row>[] = [{ key: "name" }, { key: "team" }];
it.each([
  ["group", false],
  ["group", true],
  ["tree", false],
  ["tree", true],
] as const)(
  "hydrates genuine %s controls without replacing nodes (mobile=%s)",
  async (mode, mobile) => {
    const makeApp = () =>
      createSSRApp({
        render: () =>
          h(DataTable<Row>, {
            data: rows,
            columns,
            rowKey: (row) => row.id,
            urlSync: false,
            forceMobile: mobile,
            dir: "rtl",
            selectable: true,
            features: [
              mode === "group"
                ? grouping("team")
                : tree<Row>({ getParentId: (row) => row.parent }),
            ],
          }),
      }).use(ui);
    const root = document.createElement("div");
    root.innerHTML = await renderToString(makeApp());
    document.body.append(root);
    const selector = `[data-adapttable-part="${mode === "group" ? "group-toggle" : "tree-toggle"}"]`;
    const original = root.querySelector<HTMLButtonElement>(selector);
    expect(original).toBeInstanceOf(HTMLButtonElement);
    const client = makeApp();
    try {
      client.mount(root);
      await nextTick();
      await nextTick();
      expect(root.querySelector(selector)).toBe(original);
      expect(original?.getAttribute("data-slot")).toBe("base");
      original?.click();
      await nextTick();
      await nextTick();
      expect(original?.getAttribute("aria-expanded")).toBe(
        mode === "group" ? "false" : "true"
      );
      expect(root.textContent?.includes("Bea")).toBe(mode === "tree");
    } finally {
      client.unmount();
      root.remove();
    }
  }
);

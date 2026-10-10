// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";

interface Person {
  id: string;
  name: string;
  age: number;
}

describe("native column group server rendering", () => {
  it.each([false, true])(
    "renders the required localized toggle without browser globals, collapsed=%s",
    async (collapsed) => {
      const html = await renderToString(
        createSSRApp({
          render: () =>
            h(DataTable<Person>, {
              data: [{ id: "ada", name: "Ada", age: 36 }],
              columns: [
                {
                  header: "Person",
                  collapsedKey: "name",
                  children: [{ key: "name" }, { key: "age" }],
                },
              ],
              rowKey: (row) => row.id,
              urlSync: false,
              dir: "rtl",
              collapsibleColumnGroups: true,
              defaultColumnLayout: {
                collapsedGroups: collapsed ? ["Person"] : [],
              },
              labels: {
                collapseColumnGroup: "طي الأعمدة",
                expandColumnGroup: "توسيع الأعمدة",
              },
              classNames: { columnGroupToggle: "native-group-toggle" },
            }),
        })
      );
      expect(typeof window).toBe("undefined");
      expect(typeof document).toBe("undefined");
      expect(html).toContain('data-adapttable-part="column-group-toggle"');
      expect(html).toContain(`aria-expanded="${String(!collapsed)}"`);
      expect(html).toContain(
        `aria-label="${collapsed ? "توسيع الأعمدة" : "طي الأعمدة"}: Person"`
      );
      expect(html).toContain('class="native-group-toggle"');
      expect(html.match(/<td(?:\s|>)/g)).toHaveLength(collapsed ? 1 : 2);
      expect(html).toContain("Ada");
    }
  );
});

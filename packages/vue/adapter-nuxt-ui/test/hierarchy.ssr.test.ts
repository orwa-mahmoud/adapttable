// @vitest-environment node
import ui from "@nuxt/ui/vue-plugin";
import { expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { grouping } from "../src/grouping";
import { rowDetail } from "../src/row-detail";

it("server-renders independent grouped requests and host detail content", async () => {
  interface Row {
    id: string;
    name: string;
    team: string;
  }
  expect(typeof document).toBe("undefined");
  const render = (name: string, mobile: boolean) =>
    renderToString(
      createSSRApp({
        render: () =>
          h(DataTable<Row>, {
            data: [{ id: name, name, team: name }],
            columns: [{ key: "name" }, { key: "team" }],
            rowKey: (row) => row.id,
            forceMobile: mobile,
            urlSync: false,
            selectable: true,
            features: [
              grouping("team"),
              rowDetail<Row>((row) => h("p", `Detail ${row.name}`), [name]),
            ],
          }),
      }).use(ui)
    );
  const [desktop, mobile] = await Promise.all([
    render("Desk", false),
    render("Mobile", true),
  ]);
  for (const text of [desktop, mobile]) {
    expect(text).toContain('data-adapttable-part="group-toggle"');
    expect(text).toContain('role="checkbox"');
  }
  expect(desktop).toContain("<table");
  expect(desktop).toContain("Detail Desk");
  expect(desktop).not.toContain("Mobile");
  expect(mobile).toContain("<article");
  expect(mobile).toContain("Detail Mobile");
  expect(mobile).not.toContain("Desk");
});
